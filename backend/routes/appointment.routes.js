const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointment.controller");
const { verifyToken, isDoctorRole } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Get all appointments
router.get("/appointments", verifyToken, isDoctorRole, appointmentController.getAllAppointments);

// Create new appointment
router.post("/appointments", verifyToken, isDoctorRole, appointmentController.createAppointment);

// Complete appointment (with documents)
router.post("/appointments/complete", verifyToken, isDoctorRole, upload.array('documents', 10), appointmentController.completeAppointment);

// Mark appointment as DONE (adds to patient records) - THIS IS THE KEY ROUTE
router.put("/appointments/:appointmentId/done", verifyToken, isDoctorRole, appointmentController.markAppointmentAsDone);

// Delete appointment
router.delete("/appointments/:appointmentId", verifyToken, isDoctorRole, appointmentController.deleteAppointment);

module.exports = router;