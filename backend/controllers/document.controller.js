const connection = require("../config/database");
const { generateDocumentId } = require("../utils/helpers");

exports.uploadDocument = (req, res) => {
  const { patientId } = req.params;
  const { notes } = req.body;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No document provided"
    });
  }

  const documentId = generateDocumentId();
  const documentData = {
    document_id: documentId,
    patient_id: patientId,
    uploaded_by_id: req.user.user_id,
    uploaded_by_name: req.user.name,
    uploaded_by_role: 'doctor',
    document_data: req.file.buffer,
    document_name: req.file.originalname,
    document_type: req.file.mimetype,
    document_size: req.file.size,
    notes: notes || null
  };

  connection.query("INSERT INTO patient_documents SET ?", documentData, (err) => {
    if (err) {
      console.error("Error uploading document:", err);
      return res.status(500).json({
        success: false,
        message: "Error uploading document"
      });
    }

    res.json({
      success: true,
      message: "Document uploaded successfully",
      documentId: documentId
    });
  });
};

exports.getPatientDocuments = (req, res) => {
  const { patientId } = req.params;
  
  if (req.user.role === 'patient' && req.user.user_id !== patientId) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You can only view your own documents."
    });
  }

  const query = `
    SELECT 
      document_id,
      patient_id,
      uploaded_by_id,
      uploaded_by_name,
      uploaded_by_role,
      document_name,
      document_type,
      document_size,
      uploaded_at,
      notes
    FROM patient_documents
    WHERE patient_id = ?
    ORDER BY uploaded_at DESC
  `;


  connection.query(query, [patientId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error occurred"
      });
    }

    res.json({
      success: true,
      documents: results,
      count: results.length
    });
  });
};

exports.downloadDocument = (req, res) => {
  const { patientId, documentId } = req.params;

  if (req.user.role === 'patient' && req.user.user_id !== patientId) {
    return res.status(403).json({
      success: false,
      message: "Access denied."
    });
  }

  connection.query(
    `SELECT document_data, document_name, document_type 
     FROM patient_documents 
     WHERE document_id = ? AND patient_id = ?`,
    [documentId, patientId],
    (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Database error occurred"
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Document not found"
        });
      }

      const document = results[0];
      res.setHeader('Content-Type', document.document_type);
      res.setHeader('Content-Disposition', `attachment; filename="${document.document_name}"`);
      res.send(document.document_data);
    }
  );
};
