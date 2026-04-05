const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const { verifyToken, isPatientRole, isDoctorRole } = require("../middleware/auth");

// ── Stripe Checkout (redirect-based, same as ecommerce) ──────────────────────
// Patient: create Stripe Checkout Session → returns { url } for redirect
router.post("/payment/create-checkout-session", verifyToken, isPatientRole, paymentController.createCheckoutSession);

// Patient: called by /payment-complete page after Stripe redirects back
router.post("/payment/verify-checkout-session", verifyToken, isPatientRole, paymentController.verifyCheckoutSession);

// ── Stripe Payment Intent (kept for backward compatibility) ───────────────────
router.post("/payment/create-intent", verifyToken, isPatientRole, paymentController.createPaymentIntent);
router.post("/payment/verify-stripe", verifyToken, isPatientRole, paymentController.verifyStripePayment);

// ── Cash Payment ──────────────────────────────────────────────────────────────
// Patient: record pending cash payment intent
router.post("/payment/record-pending-cash", verifyToken, isPatientRole, paymentController.recordPendingCashByPatient);

// Doctor: mark cash as received
router.post("/payment/record-cash", verifyToken, isDoctorRole, paymentController.recordCashPayment);

// Shared: get payment details for an appointment
router.get("/payment/appointment/:appointmentId", verifyToken, paymentController.getPaymentByAppointment);

module.exports = router;