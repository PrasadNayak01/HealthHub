const connection = require("../config/database");

// ========== PROFILE MANAGEMENT ==========

// Get patient profile
exports.getProfile = (req, res) => {
  const userId = req.user.user_id;

  const query = `
    SELECT 
      u.user_id,
      u.name,
      u.email,
      u.phone,
      u.role,
      pp.age,
      pp.gender,
      pp.weight,
      pp.height,
      pp.blood_group,
      pp.address,
      pp.medical_history,
      pp.allergies,
      pp.current_medications,
      pp.emergency_contact_name,
      pp.emergency_contact_phone,
      pp.medical_report_data,
      pp.medical_report_name,
      pp.medical_report_type,
      pp.medical_report_upload_date,
      pp.created_at,
      pp.updated_at
    FROM users u
    LEFT JOIN patient_profiles pp ON u.user_id = pp.patient_id
    WHERE u.user_id = ?
  `;

  connection.query(query, [userId], (err, results) => {
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
        message: "Profile not found"
      });
    }

    res.json({
      success: true,
      profile: results[0]
    });
  });
};

// Update patient profile
// exports.updateProfile = (req, res) => {
//   const userId = req.user.user_id;
//   const {
//     name,
//     phone,
//     age,
//     gender,
//     weight,
//     height,
//     blood_group,
//     address,
//     medical_history,
//     allergies,
//     current_medications,
//     emergency_contact_name,
//     emergency_contact_phone
//   } = req.body;

//   const updateUserQuery = `
//     UPDATE users 
//     SET name = COALESCE(?, name), phone = ?
//     WHERE user_id = ?
//   `;

//   connection.query(updateUserQuery, [name, phone, userId], (err) => {
//     if (err) {
//       return res.status(500).json({ success: false, message: "Error updating profile" });
//     }

//     const checkProfileQuery = `SELECT * FROM patient_profiles WHERE patient_id = ?`;

//     connection.query(checkProfileQuery, [userId], (err, results) => {
//       if (err) {
//         return res.status(500).json({ success: false, message: "Error updating profile" });
//       }

//       let profileData = {
//         age,
//         gender,
//         weight,
//         height,
//         blood_group,
//         address,
//         medical_history,
//         allergies,
//         current_medications,
//         emergency_contact_name,
//         emergency_contact_phone
//       };

//       if (results.length === 0) {
//         profileData.patient_id = userId;

//         connection.query("INSERT INTO patient_profiles SET ?", profileData, (err) => {
//           if (err) {
//             return res.status(500).json({ success: false, message: "Error creating profile" });
//           }

//           res.json({ success: true, message: "Profile created successfully" });
//         });

//       } else {
//         const updateProfileQuery = `
//           UPDATE patient_profiles 
//           SET age = ?, gender = ?, weight = ?, height = ?, blood_group = ?, address = ?, 
//               medical_history = ?, allergies = ?, current_medications = ?,
//               emergency_contact_name = ?, emergency_contact_phone = ?
//           WHERE patient_id = ?
//         `;

//         const params = [
//           age, gender, weight, height, blood_group, address,
//           medical_history, allergies, current_medications,
//           emergency_contact_name, emergency_contact_phone, userId
//         ];

//         connection.query(updateProfileQuery, params, (err) => {
//           if (err) {
//             return res.status(500).json({ success: false, message: "Error updating profile" });
//           }

//           if (req.file) {
//             const { generateDocumentId } = require("../utils/helpers");

//             const documentData = {
//               document_id: generateDocumentId(),
//               patient_id: userId,
//               uploaded_by_id: userId,
//               uploaded_by_name: req.user.name,
//               uploaded_by_role: 'patient',
//               document_data: req.file.buffer,
//               document_name: req.file.originalname,
//               document_type: req.file.mimetype,
//               document_size: req.file.size,
//               notes: 'Uploaded by patient via profile'
//             };

//             connection.query("INSERT INTO patient_documents SET ?", documentData, (docErr) => {
//               if (docErr) {
//                 return res.status(500).json({
//                   success: false,
//                   message: "Profile updated but document upload failed"
//                 });
//               }

//               res.json({
//                 success: true,
//                 message: "Profile and document updated successfully"
//               });
//             });

//           } else {
//             res.json({
//               success: true,
//               message: "Profile updated successfully"
//             });
//           }
//         });
//       }
//     });
//   });
// };
// Update patient profile
exports.updateProfile = (req, res) => {
  const userId = req.user.user_id;
  const {
    name,
    phone,
    age,
    gender,
    weight,
    height,
    blood_group,
    address,
    medical_history,
    allergies,
    current_medications,
    emergency_contact_name,
    emergency_contact_phone
  } = req.body;

  const updateUserQuery = `
    UPDATE users 
    SET name = COALESCE(?, name), phone = ?
    WHERE user_id = ?
  `;

  connection.query(updateUserQuery, [name, phone, userId], (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Error updating profile" });
    }

    const checkProfileQuery = `SELECT * FROM patient_profiles WHERE patient_id = ?`;

    connection.query(checkProfileQuery, [userId], (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Error updating profile" });
      }

      let profileData = {
        age,
        gender,
        weight,
        height,
        blood_group,
        address,
        medical_history,
        allergies,
        current_medications,
        emergency_contact_name,
        emergency_contact_phone
      };

      // Helper function to handle document upload
      const handleDocumentUpload = (callback) => {
        if (req.file) {
          const { generateDocumentId } = require("../utils/helpers");

          const documentData = {
            document_id: generateDocumentId(),
            patient_id: userId,
            uploaded_by_id: userId,
            uploaded_by_name: req.user.name,
            uploaded_by_role: 'patient',
            document_data: req.file.buffer,
            document_name: req.file.originalname,
            document_type: req.file.mimetype,
            document_size: req.file.size,
            notes: 'Uploaded by patient via profile'
          };

          connection.query("INSERT INTO patient_documents SET ?", documentData, (docErr) => {
            if (docErr) {
              console.error("Document upload error:", docErr);
              return callback({
                success: false,
                message: "Profile updated but document upload failed"
              });
            }
            callback({
              success: true,
              message: "Profile and document updated successfully"
            });
          });
        } else {
          callback({
            success: true,
            message: "Profile updated successfully"
          });
        }
      };

      if (results.length === 0) {
        // NEW PROFILE - Create profile first, then handle document
        profileData.patient_id = userId;

        connection.query("INSERT INTO patient_profiles SET ?", profileData, (err) => {
          if (err) {
            return res.status(500).json({ success: false, message: "Error creating profile" });
          }

          // ✅ NOW handle document upload for new profiles too
          handleDocumentUpload((result) => {
            res.json(result);
          });
        });

      } else {
        // EXISTING PROFILE - Update profile first, then handle document
        const updateProfileQuery = `
          UPDATE patient_profiles 
          SET age = ?, gender = ?, weight = ?, height = ?, blood_group = ?, address = ?, 
              medical_history = ?, allergies = ?, current_medications = ?,
              emergency_contact_name = ?, emergency_contact_phone = ?
          WHERE patient_id = ?
        `;

        const params = [
          age, gender, weight, height, blood_group, address,
          medical_history, allergies, current_medications,
          emergency_contact_name, emergency_contact_phone, userId
        ];

        connection.query(updateProfileQuery, params, (err) => {
          if (err) {
            return res.status(500).json({ success: false, message: "Error updating profile" });
          }

          // ✅ Handle document upload for existing profiles
          handleDocumentUpload((result) => {
            res.json(result);
          });
        });
      }
    });
  });
};


// ========== DASHBOARD STATS ==========

// Get patient dashboard stats
exports.getDashboardStats = (req, res) => {
  const patientId = req.user.user_id;

  const statsQuery = `
    SELECT
      (SELECT COUNT(*) FROM appointments WHERE patient_id = ?) AS total_appointments,
      (SELECT COUNT(*) FROM appointments WHERE patient_id = ? AND status IN ('completed','done')) AS completed_appointments,
      (SELECT COUNT(*) FROM appointments WHERE patient_id = ? AND status = 'pending') AS pending_appointments,
      (SELECT COUNT(*) FROM patient_documents WHERE patient_id = ?) AS total_reports,
      (SELECT COUNT(DISTINCT doctor_id) FROM appointments WHERE patient_id = ?) AS unique_doctors
  `;

  connection.query(statsQuery, [patientId, patientId, patientId, patientId, patientId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error occurred"
      });
    }

    res.json({
      success: true,
      stats: {
        totalAppointments: results[0].total_appointments,
        completedAppointments: results[0].completed_appointments,
        pendingAppointments: results[0].pending_appointments,
        totalReports: results[0].total_reports,
        uniqueDoctors: results[0].unique_doctors
      }
    });
  });
};

// ========== DOCUMENT MANAGEMENT ==========

// Patient - Get all my documents (uploaded by anyone)
exports.getMyDocuments = (req, res) => {
  const patientId = req.user.user_id;

  // console.log('=== Getting Documents for Patient ===');
  // console.log('Patient ID:', patientId);

  // Query 1: Get documents from patient_documents table
  const query1 = `
    SELECT
      document_id,
      document_name,
      uploaded_by_name,
      uploaded_by_role,
      uploaded_at,
      document_size,
      notes
    FROM patient_documents
    WHERE patient_id = ?
  `;

  // Query 2: Get medical report from patient_profiles table - FIXED: Added LENGTH() for size
  const query2 = `
    SELECT
      'PROFILE_REPORT' as document_id,
      medical_report_name as document_name,
      u.name as uploaded_by_name,
      'patient' as uploaded_by_role,
      medical_report_upload_date as uploaded_at,
      COALESCE(medical_report_size, LENGTH(medical_report_data)) as document_size,
      'Uploaded via profile' as notes
    FROM patient_profiles pp
    JOIN users u ON pp.patient_id = u.user_id
    WHERE pp.patient_id = ? 
      AND pp.medical_report_name IS NOT NULL
  `;

  // Execute first query
  connection.query(query1, [patientId], (err1, documentsResults) => {
    if (err1) {
      console.error("❌ Database error in getMyDocuments (patient_documents):", err1);
      return res.status(500).json({ 
        success: false,
        message: "Database error occurred",
        error: err1.message
      });
    }

    // Execute second query
    connection.query(query2, [patientId], (err2, profileResults) => {
      if (err2) {
        console.error("❌ Database error in getMyDocuments (patient_profiles):", err2);
        return res.status(500).json({ 
          success: false,
          message: "Database error occurred",
          error: err2.message
        });
      }

      // Combine both results
      const allDocuments = [...documentsResults, ...profileResults];
      
      // Sort by upload date (newest first)
      allDocuments.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));

      // console.log(`✓ Found ${documentsResults.length} documents from patient_documents`);
      // console.log(`✓ Found ${profileResults.length} documents from patient_profiles`);
      // console.log(`✓ Total: ${allDocuments.length} documents for patient ${patientId}`);

      res.json({
        success: true,
        documents: allDocuments
      });
    });
  });
};

// Download document from patient_documents table
exports.downloadPatientDocument = (req, res) => {
  const { documentId } = req.params;
  const patientId = req.user.user_id;

  // console.log('=== Download Patient Document ===');
  // console.log('Document ID:', documentId);
  // console.log('Patient ID:', patientId);

  const query = `
    SELECT document_data, document_name, document_type
    FROM patient_documents
    WHERE document_id = ? AND patient_id = ?
  `;

  connection.query(query, [documentId, patientId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error occurred"
      });
    }

    if (results.length === 0) {
      // console.log('Document not found');
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    const document = results[0];
    
    // console.log('✓ Document found:', document.document_name);
    
    res.setHeader('Content-Type', document.document_type);
    res.setHeader('Content-Disposition', `attachment; filename="${document.document_name}"`);
    res.send(document.document_data);
  });
};

// Download medical report from patient_profiles table
exports.downloadProfileMedicalReport = (req, res) => {
  const patientId = req.user.user_id;

  // console.log('=== Download Profile Medical Report ===');
  // console.log('Patient ID:', patientId);

  const query = `
    SELECT medical_report_data, medical_report_name, medical_report_type
    FROM patient_profiles
    WHERE patient_id = ?
  `;

  connection.query(query, [patientId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error occurred"
      });
    }

    if (results.length === 0 || !results[0].medical_report_data) {
      // console.log('Medical report not found');
      return res.status(404).json({
        success: false,
        message: "Medical report not found"
      });
    }

    const report = results[0];
    
    // console.log('✓ Report found:', report.medical_report_name);
    
    res.setHeader('Content-Type', report.medical_report_type);
    res.setHeader('Content-Disposition', `attachment; filename="${report.medical_report_name}"`);
    res.send(report.medical_report_data);
  });
};

// Download medical report (legacy route - same as downloadProfileMedicalReport)
exports.downloadMedicalReport = (req, res) => {
  const userId = req.user.user_id;

  const query = `
    SELECT medical_report_data, medical_report_name, medical_report_type
    FROM patient_profiles
    WHERE patient_id = ?
  `;

  connection.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error occurred"
      });
    }

    if (results.length === 0 || !results[0].medical_report_data) {
      return res.status(404).json({
        success: false,
        message: "Medical report not found"
      });
    }

    const report = results[0];
    res.setHeader('Content-Type', report.medical_report_type);
    res.setHeader('Content-Disposition', `attachment; filename="${report.medical_report_name}"`);
    res.send(report.medical_report_data);
  });
};

// Delete medical report
exports.deleteMedicalReport = (req, res) => {
  const userId = req.user.user_id;

  const query = `
    UPDATE patient_profiles
    SET medical_report_data = NULL, medical_report_name = NULL, medical_report_type = NULL
    WHERE patient_id = ?
  `;

  connection.query(query, [userId], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error occurred"
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    res.json({
      success: true,
      message: "Medical report deleted successfully"
    });
  });
};

// ========== DOCTOR-FACING ENDPOINTS ==========

// Get recent patients (for doctors)
exports.getRecentPatients = (req, res) => {
  const doctorId = req.user.user_id;

  const query = `
    SELECT 
      pr.patient_id,
      u.name AS patient_name,
      u.email AS patient_email,
      u.phone AS patient_phone,
      pp.age,
      pp.gender,
      pp.blood_group,
      MAX(a.appointment_date) AS last_appointment,
      pr.total_visits
    FROM patient_records pr
    JOIN users u 
      ON pr.patient_id = u.user_id
    LEFT JOIN patient_profiles pp 
      ON pr.patient_id = pp.patient_id
    LEFT JOIN appointments a 
      ON a.patient_id = pr.patient_id
     AND a.doctor_id = pr.doctor_id
     AND a.status IN ('completed','done')
    WHERE pr.doctor_id = ?
    GROUP BY 
      pr.patient_id,
      u.name,
      u.email,
      u.phone,
      pp.age,
      pp.gender,
      pp.blood_group,
      pr.total_visits
    ORDER BY last_appointment DESC
    LIMIT 10
  `;

  connection.query(query, [doctorId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error occurred"
      });
    }

    res.json({
      success: true,
      patients: results
    });
  });
};

// Get all patient records (for doctors)
exports.getAllPatientRecords = (req, res) => {
  const doctorId = req.user.user_id;

  // console.log('=== Get All Patient Records ===');
  // console.log('Doctor ID:', doctorId);

  const query = `
    SELECT 
      pr.record_id,
      pr.patient_id,
      pr.doctor_id,
      u.name as patient_name,
      u.email as patient_email,
      u.phone as patient_phone,
      pp.age,
      pp.gender,
      pp.blood_group,
      pp.address,
      pp.medical_history,
      pp.allergies,
      pp.current_medications,
      pr.first_visit_date,
      pr.last_visit_date,
      pr.total_visits,
      pr.created_at,
      pr.updated_at
    FROM patient_records pr
    JOIN users u ON pr.patient_id = u.user_id
    LEFT JOIN patient_profiles pp ON pr.patient_id = pp.patient_id
    WHERE pr.doctor_id = ?
    ORDER BY pr.last_visit_date DESC
  `;

  connection.query(query, [doctorId], (err, results) => {
    if (err) {
      console.error("❌ Database error in getAllPatientRecords:", err);
      console.error("SQL Query:", query);
      console.error("Doctor ID:", doctorId);
      return res.status(500).json({
        success: false,
        message: "Database error occurred",
        error: err.message
      });
    }

    // console.log('✓ Found', results.length, 'patient records');
    res.json({
      success: true,
      records: results
    });
  });
};