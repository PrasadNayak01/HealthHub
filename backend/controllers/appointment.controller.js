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

  // console.log('=== Complete Appointment ===');
  // console.log('Appointment ID:', appointmentId);
  // console.log('Doctor ID:', doctorId);

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

    // console.log('Found appointment for patient:', appointment.patient_name);

    // Update appointment status to 'completed'
    const updateQuery = `
      UPDATE appointments 
      SET status = 'completed', notes = ?, completed_at = NOW() 
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

      // console.log('Appointment marked as completed');

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
          // console.log('Adding patient to doctor records...');
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
              } else {
                // console.log('✓ Patient added to records!');
              }
            }
          );
        } else {
          // Patient exists - UPDATE THEIR RECORD
          // console.log('Updating existing patient record...');
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
              } else {
                // console.log('✓ Patient record updated!');
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

  // console.log('=== Mark Appointment as Done ===');
  // console.log('Appointment ID:', appointmentId);
  // console.log('Doctor ID:', doctorId);

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
    // console.log('Found appointment for patient:', appointment.patient_name);

    // Step 2: Update appointment status to 'done'
    const updateAppointmentQuery = `
      UPDATE appointments 
      SET status = 'done', completed_at = NOW() 
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

      // console.log('Appointment marked as done');

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
          // console.log('Adding new patient to records:', appointment.patient_name);

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

              // console.log('✓ Patient added to records!');
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
          // console.log('Updating existing patient record:', appointment.patient_name);

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

              // console.log('✓ Patient record updated!');
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