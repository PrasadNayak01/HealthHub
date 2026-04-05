const connection = require("../config/database");
const { generateAppointmentId } = require("../utils/helpers");

exports.createAppointment = (req, res) => {
  const { patientId, appointmentDate, appointmentTime } = req.body;

  if (!patientId || !appointmentDate) {
    return res.status(400).json({
      success: false,
      message: "Patient ID and Appointmenat Date are required"
    });
  }

  const appointmentId = generateAppointmentId();
  const appointmentData = {
    appointment_id: appointmentId,
    patient_id: patientId,
    doctor_id: req.user.user_id,
    appointment_date: appointmentDate,
    appointment_time: appointmentTime,
    status: 'pending'
  };

  connection.query("INSERT INTO appointments SET ?", appointmentData, (err) => {
    if (err) {
      console.error("Error creating appointment:", err);
      return res.status(500).json({
        success: false,
        message: "Error creating appointment"
      });
    }

    res.json({
      success: true,
      message: "Appointment created successfully",
      appointmentId: appointmentId
    });
  });
};

exports.getAllAppointments = (req, res) => {
  const query = `
    SELECT 
      a.appointment_id,
      a.patient_id,
      a.doctor_id,
      DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date,
      a.appointment_time,
      a.status,
      a.payment_status,
      a.payment_method,
      a.notes,
      a.created_at,
      a.completed_at,
      u.name as patient_name,
      u.email as patient_email,
      u.phone as patient_phone,
      pp.age as patient_age,
      pp.gender as patient_gender,
      pp.blood_group as patient_blood_group
    FROM appointments a
    JOIN users u ON a.patient_id = u.user_id
    LEFT JOIN patient_profiles pp ON a.patient_id = pp.patient_id
    WHERE a.doctor_id = ?
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
  `;

  connection.query(query, [req.user.user_id], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error occurred"
      });
    }

    res.json({
      success: true,
      appointments: results
    });
  });
};

exports.completeAppointment = (req, res) => {
  const { appointmentId, notes } = req.body;
  const doctorId = req.user.user_id;

  if (!appointmentId) {
    return res.status(400).json({
      success: false,
      message: "Appointment ID is required"
    });
  }

  // Get appointment details with patient info
  const getAppointmentQuery = `
    SELECT a.*, u.name as patient_name 
    FROM appointments a
    JOIN users u ON a.patient_id = u.user_id
    WHERE a.appointment_id = ? AND a.doctor_id = ?
  `;

  connection.query(getAppointmentQuery, [appointmentId, doctorId], (err, appointmentResult) => {
    if (err) {
      console.error("Error fetching appointment:", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching appointment"
      });
    }

    if (appointmentResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    const appointment = appointmentResult[0];
    const patientId = appointment.patient_id;

    // Update appointment status to 'completed'
    // If payment_method is 'cash' and payment_status is still 'pending', mark it as 'paid' automatically
    const updateQuery = `
      UPDATE appointments 
      SET 
        status = 'completed', 
        notes = ?, 
        completed_at = NOW(),
        payment_status = CASE 
          WHEN payment_method = 'cash' AND (payment_status IS NULL OR payment_status = 'pending') 
          THEN 'paid' 
          ELSE payment_status 
        END
      WHERE appointment_id = ? AND doctor_id = ?
    `;

    connection.query(updateQuery, [notes || null, appointmentId, doctorId], (err) => {
      if (err) {
        console.error("Error updating appointment:", err);
        return res.status(500).json({
          success: false,
          message: "Error updating appointment"
        });
      }

      // Add/update patient in patient_records table
      const checkPatientQuery = `
        SELECT * FROM patient_records 
        WHERE patient_id = ? AND doctor_id = ?
      `;

      connection.query(checkPatientQuery, [patientId, doctorId], (err, patientRecords) => {
        if (err) {
          console.error("Error checking patient records:", err);
        } else if (patientRecords.length === 0) {
          // Patient doesn't exist in this doctor's records - ADD THEM
          const insertPatientQuery = `
            INSERT INTO patient_records 
            (patient_id, doctor_id, first_visit_date, last_visit_date, total_visits, created_at, updated_at)
            VALUES (?, ?, NOW(), NOW(), 1, NOW(), NOW())
          `;

          connection.query(
            insertPatientQuery,
            [patientId, doctorId],
            (err) => {
              if (err) {
                console.error("Error adding patient to records:", err);
              }
            }
          );
        } else {
          // Patient exists - UPDATE THEIR RECORD
          const updatePatientQuery = `
            UPDATE patient_records 
            SET last_visit_date = NOW(), 
                total_visits = total_visits + 1, 
                updated_at = NOW()
            WHERE patient_id = ? AND doctor_id = ?
          `;

          connection.query(
            updatePatientQuery,
            [patientId, doctorId],
            (err) => {
              if (err) {
                console.error("Error updating patient record:", err);
              }
            }
          );
        }
      });

      // Handle documents if any
      if (req.files && req.files.length > 0) {
        const { generateDocumentId } = require("../utils/helpers");
        
        const documentPromises = req.files.map(file => {
          return new Promise((resolve, reject) => {
            const documentId = generateDocumentId();
            const documentData = {
              document_id: documentId,
              patient_id: patientId,
              uploaded_by_id: doctorId,
              uploaded_by_name: req.user.name,
              uploaded_by_role: 'doctor',
              document_data: file.buffer,
              document_name: file.originalname,
              document_type: file.mimetype,
              document_size: file.size,
              notes: `Uploaded during appointment completion - ${appointmentId}`
            };

            connection.query("INSERT INTO patient_documents SET ?", documentData, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        });

        const oldDocPromises = req.files.map(file => {
          return new Promise((resolve, reject) => {
            const documentData = {
              appointment_id: appointmentId,
              document_data: file.buffer,
              document_name: file.originalname,
              document_type: file.mimetype,
              document_size: file.size,
              file_category: file.mimetype === 'application/pdf' ? 'prescription' : 'report'
            };

            connection.query("INSERT INTO appointment_documents SET ?", documentData, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        });

        Promise.all([...documentPromises, ...oldDocPromises])
          .then(() => {
            res.json({
              success: true,
              message: "Appointment completed successfully! Patient added to your records."
            });
          })
          .catch(err => {
            console.error("Error saving documents:", err);
            res.json({
              success: true,
              message: "Appointment completed but some documents failed to upload"
            });
          });
      } else {
        res.json({
          success: true,
          message: "Appointment completed successfully! Patient added to your records."
        });
      }
    });
  });
};

exports.deleteAppointment = (req, res) => {
  const { appointmentId } = req.params;

  connection.query(
    "DELETE FROM appointments WHERE appointment_id = ? AND doctor_id = ?",
    [appointmentId, req.user.user_id],
    (err, result) => {
      if (err) {
        console.error("Error deleting appointment:", err);
        return res.status(500).json({
          success: false,
          message: "Error deleting appointment"
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found"
        });
      }

      res.json({
        success: true,
        message: "Appointment deleted successfully"
      });
    }
  );
};

// Mark appointment as done AND add patient to records
exports.markAppointmentAsDone = (req, res) => {
  const { appointmentId } = req.params;
  const doctorId = req.user.user_id;

  // Step 1: Get appointment details
  const getAppointmentQuery = `
    SELECT 
      a.*,
      u.user_id as patient_id,
      u.name as patient_name,
      u.email as patient_email,
      u.phone as patient_phone,
      pp.age as patient_age,
      pp.gender as patient_gender,
      pp.blood_group as patient_blood_group
    FROM appointments a
    JOIN users u ON a.patient_id = u.user_id
    LEFT JOIN patient_profiles pp ON a.patient_id = pp.patient_id
    WHERE a.appointment_id = ? AND a.doctor_id = ?
  `;

  connection.query(getAppointmentQuery, [appointmentId, doctorId], (err, appointmentResult) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error occurred"
      });
    }

    if (appointmentResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    const appointment = appointmentResult[0];

    // Step 2: Update appointment status to 'done'
    // Also auto-mark cash payments as paid
    const updateAppointmentQuery = `
      UPDATE appointments 
      SET 
        status = 'done', 
        completed_at = NOW(),
        payment_status = CASE 
          WHEN payment_method = 'cash' AND (payment_status IS NULL OR payment_status = 'pending') 
          THEN 'paid' 
          ELSE payment_status 
        END
      WHERE appointment_id = ? AND doctor_id = ?
    `;

    connection.query(updateAppointmentQuery, [appointmentId, doctorId], (err) => {
      if (err) {
        console.error("Error updating appointment:", err);
        return res.status(500).json({
          success: false,
          message: "Error updating appointment"
        });
      }

      // Step 3: Check if patient exists in patient_records for this doctor
      const checkPatientQuery = `
        SELECT * FROM patient_records 
        WHERE patient_id = ? AND doctor_id = ?
      `;

      connection.query(checkPatientQuery, [appointment.patient_id, doctorId], (err, patientRecords) => {
        if (err) {
          console.error("Database error checking patient records:", err);
          return res.status(500).json({
            success: false,
            message: "Database error occurred"
          });
        }

        if (patientRecords.length === 0) {
          // Patient doesn't exist in this doctor's records - ADD THEM
          const insertPatientQuery = `
            INSERT INTO patient_records 
            (patient_id, doctor_id, first_visit_date, last_visit_date, total_visits, created_at, updated_at)
            VALUES (?, ?, NOW(), NOW(), 1, NOW(), NOW())
          `;

          connection.query(
            insertPatientQuery,
            [appointment.patient_id, doctorId],
            (err) => {
              if (err) {
                console.error("Error adding patient to records:", err);
                return res.status(500).json({
                  success: false,
                  message: "Failed to add patient to records"
                });
              }

              res.json({
                success: true,
                message: "Appointment marked as done and patient added to your records!",
                patientAdded: true,
                appointment: appointment
              });
            }
          );
        } else {
          // Patient exists - UPDATE THEIR RECORD
          const updatePatientQuery = `
            UPDATE patient_records 
            SET last_visit_date = NOW(), 
                total_visits = total_visits + 1, 
                updated_at = NOW()
            WHERE patient_id = ? AND doctor_id = ?
          `;

          connection.query(
            updatePatientQuery,
            [appointment.patient_id, doctorId],
            (err) => {
              if (err) {
                console.error("Error updating patient record:", err);
                return res.status(500).json({
                  success: false,
                  message: "Failed to update patient record"
                });
              }

              res.json({
                success: true,
                message: "Appointment marked as done. Patient record updated!",
                patientAdded: false,
                appointment: appointment
              });
            }
          );
        }
      });
    });
  });
};

// Patient books an appointment
exports.patientBookAppointment = (req, res) => {
  const { doctorId, appointmentDate, appointmentTime } = req.body;
  const patientId = req.user.user_id;

  if (!doctorId || !appointmentDate || !appointmentTime) {
    return res.status(400).json({
      success: false,
      message: "Doctor ID, Appointment Date, and Time are required"
    });
  }

  // Check if slot is already booked
  const checkSlotQuery = `
    SELECT appointment_id FROM appointments
    WHERE doctor_id = ?
      AND appointment_date = ?
      AND appointment_time = ?
      AND status NOT IN ('cancelled')
  `;

  connection.query(checkSlotQuery, [doctorId, appointmentDate, appointmentTime], (err, existing) => {
    if (err) {
      console.error("Error checking slot:", err);
      return res.status(500).json({ success: false, message: "Database error occurred" });
    }

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This time slot is already booked. Please choose another time."
      });
    }

    const { generateAppointmentId } = require("../utils/helpers");
    const appointmentId = generateAppointmentId();

    const appointmentData = {
      appointment_id: appointmentId,
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      status: 'pending'
    };

    connection.query("INSERT INTO appointments SET ?", appointmentData, (err) => {
      if (err) {
        console.error("Error booking appointment:", err);
        return res.status(500).json({ success: false, message: "Error booking appointment" });
      }

      res.json({
        success: true,
        message: "Appointment booked successfully!",
        appointmentId: appointmentId
      });
    });
  });
};

// Get booked slots for a doctor on a date (for patient to see availability)
exports.getBookedSlots = (req, res) => {
  const { doctorId, date } = req.query;

  if (!doctorId || !date) {
    return res.status(400).json({ success: false, message: "Doctor ID and date are required" });
  }

  const query = `
    SELECT appointment_time
    FROM appointments
    WHERE doctor_id = ?
      AND appointment_date = ?
      AND status NOT IN ('cancelled')
  `;

  connection.query(query, [doctorId, date], (err, results) => {
    if (err) {
      console.error("Error fetching booked slots:", err);
      return res.status(500).json({ success: false, message: "Database error occurred" });
    }

    const bookedSlots = results.map(r => r.appointment_time);
    res.json({ success: true, bookedSlots });
  });
};

// Patient get their own appointments
exports.getPatientAppointments = (req, res) => {
  const patientId = req.user.user_id;

  const query = `
    SELECT
      a.appointment_id,
      a.doctor_id,
      DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date,
      a.appointment_time,
      a.status,
      a.notes,
      a.created_at,
      u.name as doctor_name,
      dp.speciality,
      dp.consultation_fee,
      dp.address as clinic_address
    FROM appointments a
    JOIN users u ON a.doctor_id = u.user_id
    LEFT JOIN doctor_profiles dp ON a.doctor_id = dp.doctor_id
    WHERE a.patient_id = ?
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
  `;

  connection.query(query, [patientId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ success: false, message: "Database error occurred" });
    }

    res.json({ success: true, appointments: results });
  });
};