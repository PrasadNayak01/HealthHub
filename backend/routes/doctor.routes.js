const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctor.controller");
const { verifyToken, isDoctorRole, isPatientRole } = require("../middleware/auth");

router.get("/doctor-profile", verifyToken, isDoctorRole, doctorController.getProfile);
router.post("/doctor-profile", verifyToken, isDoctorRole, doctorController.updateProfile);
router.get("/doctors", verifyToken, isPatientRole, doctorController.getAllDoctors);
router.get("/search-patient/:patientId", verifyToken, isDoctorRole, doctorController.searchPatient);
router.get("/doctor/dashboard-stats", verifyToken, isDoctorRole, doctorController.getDashboardStats);
router.get("/doctor/recent-patients", verifyToken, isDoctorRole, doctorController.getRecentPatients);

module.exports = router;