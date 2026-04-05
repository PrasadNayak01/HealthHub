require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const connection = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5001";

function generatePaymentId() {
  return "PAY-" + uuidv4();
}

exports.createCheckoutSession = async (req, res) => {
  const { doctorId, amount, doctorName, appointmentDate, appointmentTime } = req.body;
  const patientId = req.user.user_id;
  const patientEmail = req.user.email;

  if (!doctorId || !amount || !appointmentDate || !appointmentTime) {
    return res.status(400).json({
      success: false,
      message: "doctorId, amount, appointmentDate and appointmentTime are required",
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: "Consultation with Dr. " + doctorName,
              description: "Date: " + appointmentDate + "  |  Time: " + appointmentTime,
            },
            unit_amount: Math.round(amount * 100), // INR to paise
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: CLIENT_URL + "/html/payment-complete.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url:  CLIENT_URL + "/html/payment-cancel.html",

      // REQUIRED FOR INDIA EXPORT
      billing_address_collection: "required",

      // Pre-fill patient's email and lock it
      customer_email: patientEmail,

      // Store everything needed to create the appointment after payment
      metadata: {
        patientId,
        doctorId,
        amount: amount.toString(),
        doctorName,
        appointmentDate,
        appointmentTime,
      },
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.error("Stripe Checkout Session error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create checkout session: " + err.message,
    });
  }
};



// VERIFY CHECKOUT SESSION + BOOK APPOINTMENT

exports.verifyCheckoutSession = async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ success: false, message: "sessionId is required" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (session.payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment not completed. Status: " + session.payment_status,
      });
    }

    const { patientId, doctorId, amount, appointmentDate, appointmentTime } = session.metadata;
    const stripePaymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    // ── Idempotency: check if this session was already processed
    connection.query(
      "SELECT payment_id, appointment_id FROM payments WHERE stripe_payment_intent_id = ?",
      [stripePaymentIntentId],
      (checkErr, existing) => {
        if (checkErr) {
          console.error("DB check error:", checkErr);
          return res.status(500).json({ success: false, message: "DB error" });
        }

        if (existing.length > 0) {
          return res.json({
            success: true,
            message: "Payment already verified",
            paymentId: existing[0].payment_id,
            appointmentId: existing[0].appointment_id,
          });
        }

        // ── Step 1: Book the appointment NOW (payment confirmed) ──
        const appointmentId = "APT-" + uuidv4();

        const appointmentData = {
          appointment_id:   appointmentId,
          patient_id:       patientId,
          doctor_id:        doctorId,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          status:           "pending",
          payment_method:   "online",
          payment_status:   "paid",
        };

        connection.query("INSERT INTO appointments SET ?", appointmentData, (aptErr) => {
          if (aptErr) {
            if (aptErr.code === "ER_DUP_ENTRY") {
              return res.status(409).json({
                success: false,
                message: "This slot was just booked by someone else. Please contact support for a refund.",
              });
            }
            console.error("Error creating appointment:", aptErr);
            return res.status(500).json({ success: false, message: "DB error creating appointment" });
          }

          // ── Step 2: Record the payment ──
          const paymentId = generatePaymentId();
          const paymentData = {
            payment_id:               paymentId,
            appointment_id:           appointmentId,
            patient_id:               patientId,
            doctor_id:                doctorId,
            amount:                   parseFloat(amount),
            payment_method:           "online",
            payment_status:           "paid",
            stripe_payment_intent_id: stripePaymentIntentId,
          };

          connection.query("INSERT INTO payments SET ?", paymentData, (payErr) => {
            if (payErr) {
              console.error("DB error saving payment:", payErr);
              return res.status(500).json({ success: false, message: "DB error saving payment" });
            }

            // ── Step 3: Update patient_records (visit tracking, non-fatal) ──
            connection.query(
              `INSERT INTO patient_records (patient_id, doctor_id, first_visit_date, last_visit_date, total_visits)
               VALUES (?, ?, ?, ?, 1)
               ON DUPLICATE KEY UPDATE
                 last_visit_date = VALUES(last_visit_date),
                 total_visits = total_visits + 1`,
              [patientId, doctorId, appointmentDate, appointmentDate],
              (recErr) => {
                if (recErr) console.error("Error updating patient_records:", recErr);
              }
            );

            res.json({
              success:       true,
              message:       "Payment verified and appointment booked",
              paymentId,
              appointmentId,

              doctorName: session.metadata.doctorName,
              amount: session.metadata.amount,
              appointmentDate: session.metadata.appointmentDate,
              appointmentTime: session.metadata.appointmentTime,
            });
          });
        });
      }
    );
  } catch (err) {
    console.error("Stripe session verify error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment: " + err.message,
    });
  }
};

// CASH PAYMENT — Doctor confirms cash received
exports.recordCashPayment = (req, res) => {
  const { appointmentId } = req.body;
  const doctorId = req.user.user_id;

  if (!appointmentId) {
    return res.status(400).json({ success: false, message: "appointmentId is required" });
  }

  const getQuery = `
    SELECT a.*, dp.consultation_fee, a.patient_id
    FROM appointments a
    LEFT JOIN doctor_profiles dp ON a.doctor_id = dp.doctor_id
    WHERE a.appointment_id = ? AND a.doctor_id = ?
  `;

  connection.query(getQuery, [appointmentId, doctorId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    const apt = results[0];

    connection.query(
      "SELECT payment_id FROM payments WHERE appointment_id = ? AND payment_method = 'cash'",
      [appointmentId],
      (err2, existing) => {
        if (err2) return res.status(500).json({ success: false, message: "DB error" });

        if (existing.length > 0) {
          connection.query(
            "UPDATE payments SET payment_status='paid' WHERE appointment_id=? AND payment_method='cash'",
            [appointmentId],
            (err3) => {
              if (err3) return res.status(500).json({ success: false, message: "DB error" });
              connection.query(
                "UPDATE appointments SET payment_method='cash', payment_status='paid' WHERE appointment_id=?",
                [appointmentId],
                () => res.json({ success: true, message: "Cash payment recorded", paymentId: existing[0].payment_id })
              );
            }
          );
        } else {
          const paymentId = generatePaymentId();
          const paymentData = {
            payment_id:     paymentId,
            appointment_id: appointmentId,
            patient_id:     apt.patient_id,
            doctor_id:      doctorId,
            amount:         apt.consultation_fee || 0,
            payment_method: "cash",
            payment_status: "paid",
          };
          connection.query("INSERT INTO payments SET ?", paymentData, (err3) => {
            if (err3) return res.status(500).json({ success: false, message: "DB error" });
            connection.query(
              "UPDATE appointments SET payment_method='cash', payment_status='paid' WHERE appointment_id=?",
              [appointmentId],
              () => res.json({ success: true, message: "Cash payment recorded", paymentId })
            );
          });
        }
      }
    );
  });
};

// GET PAYMENT BY APPOINTMENT
exports.getPaymentByAppointment = (req, res) => {
  const { appointmentId } = req.params;
  const query = `
    SELECT p.*, u.name as patient_name
    FROM payments p
    JOIN users u ON p.patient_id = u.user_id
    WHERE p.appointment_id = ?
    ORDER BY p.created_at DESC
    LIMIT 1
  `;
  connection.query(query, [appointmentId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "DB error" });
    res.json({ success: true, payment: results[0] || null });
  });
};

// RECORD PENDING CASH — Patient records cash intent before visit
exports.recordPendingCashByPatient = (req, res) => {
  const { appointmentId, doctorId, amount } = req.body;
  const patientId = req.user.user_id;

  if (!appointmentId || !doctorId) {
    return res.status(400).json({ success: false, message: "appointmentId and doctorId are required" });
  }

  connection.query(
    "SELECT payment_id FROM payments WHERE appointment_id = ?",
    [appointmentId],
    (checkErr, existing) => {
      if (checkErr) return res.status(500).json({ success: false, message: "DB error" });

      if (existing.length > 0) {
        connection.query(
          "UPDATE appointments SET payment_method='cash', payment_status='pending' WHERE appointment_id=?",
          [appointmentId],
          () => res.json({ success: true, message: "Payment record already exists" })
        );
        return;
      }

      const paymentId = generatePaymentId();
      const data = {
        payment_id:     paymentId,
        appointment_id: appointmentId,
        patient_id:     patientId,
        doctor_id:      doctorId,
        amount:         amount || 0,
        payment_method: "cash",
        payment_status: "pending",
      };

      connection.query("INSERT INTO payments SET ?", data, (err) => {
        if (err) return res.status(500).json({ success: false, message: "DB error" });
        connection.query(
          "UPDATE appointments SET payment_method='cash', payment_status='pending' WHERE appointment_id=?",
          [appointmentId],
          () => res.json({ success: true })
        );
      });
    }
  );
};

// KEPT FOR BACKWARD COMPATIBILITY — Stripe Payment Intent
exports.createPaymentIntent = async (req, res) => {
  const { amount, appointmentId, description } = req.body;
  const patientId = req.user.user_id;
  if (!amount || !appointmentId) {
    return res.status(400).json({ success: false, message: "amount and appointmentId are required" });
  }
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "inr",
      description: description || "Medical consultation at Health Hub",
      automatic_payment_methods: { enabled: true },
      metadata: { appointmentId, patientId },
    });
    res.json({ success: true, clientSecret: paymentIntent.client_secret, publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create payment intent: " + err.message });
  }
};

exports.verifyStripePayment = async (req, res) => {
  const { appointmentId, doctorId, amount, stripePaymentIntentId } = req.body;
  if (!appointmentId || !stripePaymentIntentId) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ success: false, message: "Payment not successful. Status: " + paymentIntent.status });
    }
    if (paymentIntent.metadata.appointmentId !== appointmentId) {
      return res.status(400).json({ success: false, message: "Payment intent mismatch" });
    }
    const paymentId = generatePaymentId();
    const patientId = req.user.user_id;
    connection.query("SELECT payment_id FROM payments WHERE appointment_id = ?", [appointmentId], (checkErr, existing) => {
      if (checkErr) return res.status(500).json({ success: false, message: "DB error" });
      const updateAppointment = (payId) => {
        connection.query(
          "UPDATE appointments SET payment_method='online', payment_status='paid' WHERE appointment_id=?",
          [appointmentId],
          () => res.json({ success: true, message: "Payment verified", paymentId: payId })
        );
      };
      if (existing.length > 0) {
        connection.query(
          `UPDATE payments SET payment_status='paid', payment_method='online', stripe_payment_intent_id=?, amount=?, doctor_id=? WHERE appointment_id=?`,
          [stripePaymentIntentId, amount, doctorId, appointmentId],
          (err) => { if (err) return res.status(500).json({ success: false, message: "DB error" }); updateAppointment(existing[0].payment_id); }
        );
      } else {
        const paymentData = { payment_id: paymentId, appointment_id: appointmentId, patient_id: patientId, doctor_id: doctorId, amount, payment_method: "online", payment_status: "paid", stripe_payment_intent_id: stripePaymentIntentId };
        connection.query("INSERT INTO payments SET ?", paymentData, (err) => {
          if (err) return res.status(500).json({ success: false, message: "DB error" });
          updateAppointment(paymentId);
        });
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to verify payment: " + err.message });
  }
};