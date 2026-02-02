const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patient.controller");
const { verifyToken, isPatientRole, isDoctorRole } = require("../middleware/auth");
const upload = require("../middleware/upload");

// PATIENT PROFILE ROUTES
router.get("/patient-profile", verifyToken, isPatientRole, patientController.getProfile);
router.post("/patient-profile", verifyToken, isPatientRole, upload.single('medical_report'), patientController.updateProfile);

// PATIENT DASHBOARD ROUTES
router.get("/patient/dashboard-stats", verifyToken, isPatientRole, patientController.getDashboardStats);

// PATIENT DOCUMENTS ROUTES
router.get("/patient/documents", verifyToken, isPatientRole, patientController.getMyDocuments);

// Download document from patient_documents table
router.get("/patient/document/:documentId/download", verifyToken, isPatientRole, patientController.downloadPatientDocument);

// Download medical report from patient_profiles table
router.get("/patient/profile/medical-report/download", verifyToken, isPatientRole, patientController.downloadProfileMedicalReport);

// Legacy route for profile medical report (backward compatibility)
router.get("/patient-profile/medical-report", verifyToken, isPatientRole, patientController.downloadMedicalReport);
router.get("/patient-profile/medical-report/download", verifyToken, isPatientRole, patientController.downloadMedicalReport);
router.delete("/patient-profile/medical-report", verifyToken, isPatientRole, patientController.deleteMedicalReport);

// DOCTOR ROUTES (for viewing patient data)
router.get('/doctor/recent-patients', verifyToken, isDoctorRole, patientController.getRecentPatients);
router.get("/patient-records", verifyToken, isDoctorRole, patientController.getAllPatientRecords);

module.exports = router;