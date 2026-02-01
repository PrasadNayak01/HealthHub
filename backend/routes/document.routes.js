const express = require("express");
const router = express.Router();
const documentController = require("../controllers/document.controller");
const { verifyToken, isDoctorRole } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.post("/patient-documents/:patientId/upload", verifyToken, isDoctorRole, upload.single('document'), documentController.uploadDocument);
router.get("/patient-documents/:patientId", verifyToken, documentController.getPatientDocuments);
router.get("/patient-documents/:patientId/:documentId/download", verifyToken, documentController.downloadDocument);

module.exports = router;