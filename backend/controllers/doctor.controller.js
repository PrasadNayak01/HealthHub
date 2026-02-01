const connection = require("../config/database");
const { getTodayDate } = require("../utils/helpers");

// Get doctor profile
exports.getProfile = (req, res) => {
  connection.query(
    "SELECT user_id, name, email, phone, role FROM users WHERE user_id = ?",
    [req.user.user_id],
    (err, userResult) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Database error occurred"
        });
      }

      if (userResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      connection.query(
        "SELECT * FROM doctor_profiles WHERE doctor_id = ?",
        [req.user.user_id],
        (err, profileResult) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
              success: false,
              message: "Database error occurred"
            });
          }

          res.json({
            success: true,
            user: userResult[0],
            profile: profileResult.length > 0 ? profileResult[0] : null
          });
        }
      );
    }
  );
};

// Update doctor profile
exports.updateProfile = (req, res) => {
  const { speciality, degree, experience, consultation_fee, address, bio } = req.body;

  if (!speciality || !degree || !experience || !consultation_fee || !address) {
    return res.status(400).json({
      success: false,
      message: "All required fields must be filled"
    });
  }

  connection.query(
    "SELECT * FROM doctor_profiles WHERE doctor_id = ?",
    [req.user.user_id],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Database error occurred"
        });
      }

      if (result.length > 0) {
        connection.query(
          `UPDATE doctor_profiles 
           SET speciality = ?, degree = ?, experience = ?, 
               consultation_fee = ?, address = ?, bio = ?
           WHERE doctor_id = ?`,
          [speciality, degree, experience, consultation_fee, address, bio, req.user.user_id],
          (err) => {
            if (err) {
              console.error("Error updating profile:", err);
              return res.status(500).json({
                success: false,
                message: "Error updating profile"
              });
            }

            res.json({
              success: true,
              message: "Profile updated successfully"
            });
          }
        );
      } else {
        const profileData = {
          doctor_id: req.user.user_id,
          speciality, 
          degree, 
          experience, 
          consultation_fee, 
          address, 
          bio
        };

        connection.query("INSERT INTO doctor_profiles SET ?", profileData, (err) => {
          if (err) {
            console.error("Error creating profile:", err);
            return res.status(500).json({
              success: false,
              message: "Error creating profile"
            });
          }

          res.json({
            success: true,
            message: "Profile created successfully"
          });
        });
      }
    }
  );
};

// Get all doctors (for patients)
exports.getAllDoctors = (req, res) => {
  const query = `
    SELECT 
      u.user_id, 
      u.name, 
      u.email, 
      u.phone,
      dp.speciality, 
      dp.degree, 
      dp.experience, 
      dp.consultation_fee, 
      dp.address, 
      dp.bio
    FROM users u
    LEFT JOIN doctor_profiles dp ON u.user_id = dp.doctor_id
    WHERE u.role = 'doctor'
    ORDER BY u.name ASC
  `;

  connection.query(query, (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error occurred"
      });
    }

    res.json({
      success: true,
      doctors: results,
      count: results.length
    });
  });
};

// Search for a patient by ID
exports.searchPatient = (req, res) => {
  const patientId = req.params.patientId.trim();

  if (!patientId.toUpperCase().startsWith('PID-')) {
    return res.status(400).json({
      success: false,
      message: "Invalid Patient ID format. ID must start with 'PID-'"
    });
  }

  connection.query(
    "SELECT user_id, name, email, phone, role FROM users WHERE user_id = ? AND role = 'patient'",
    [patientId],
    (err, userResult) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Database error occurred"
        });
      }

      if (userResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Patient not found with this ID"
        });
      }

      connection.query(
        "SELECT * FROM patient_profiles WHERE patient_id = ?",
        [patientId],
        (err, profileResult) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
              success: false,
              message: "Database error occurred"
            });
          }

          res.json({
            success: true,
            patient: {
              ...userResult[0],
              profile: profileResult.length > 0 ? profileResult[0] : null
            }
          });
        }
      );
    }
  );
};

// Get dashboard statistics
exports.getDashboardStats = (req, res) => {
  const today = getTodayDate();
  const doctorId = req.user.user_id;

  const todayAppointmentsQuery = `
    SELECT COUNT(*) as count 
    FROM appointments 
    WHERE doctor_id = ? AND DATE(appointment_date) = ?
  `;

  const uniquePatientsQuery = `
    SELECT COUNT(*) as count 
    FROM patient_records 
    WHERE doctor_id = ?
  `;

  const completedTodayQuery = `
    SELECT COUNT(*) as count 
    FROM appointments 
    WHERE doctor_id = ? AND DATE(appointment_date) = ? AND (status = 'completed' OR status = 'done')
  `;

  const pendingTodayQuery = `
    SELECT COUNT(*) as count 
    FROM appointments 
    WHERE doctor_id = ? AND DATE(appointment_date) = ? AND status = 'pending'
  `;

  Promise.all([
    new Promise((resolve, reject) => {
      connection.query(todayAppointmentsQuery, [doctorId, today], (err, result) => {
        if (err) reject(err);
        else resolve(result[0].count);
      });
    }),
    new Promise((resolve, reject) => {
      connection.query(uniquePatientsQuery, [doctorId], (err, result) => {
        if (err) reject(err);
        else resolve(result[0].count);
      });
    }),
    new Promise((resolve, reject) => {
      connection.query(completedTodayQuery, [doctorId, today], (err, result) => {
        if (err) reject(err);
        else resolve(result[0].count);
      });
    }),
    new Promise((resolve, reject) => {
      connection.query(pendingTodayQuery, [doctorId, today], (err, result) => {
        if (err) reject(err);
        else resolve(result[0].count);
      });
    })
  ])
  .then(([todayAppointments, totalPatients, completedToday, pendingToday]) => {
    res.json({
      success: true,
      stats: { 
        todayAppointments, 
        totalPatients, 
        completedToday, 
        pendingToday 
      }
    });
  })
  .catch(err => {
    console.error("Database error:", err);
    res.status(500).json({
      success: false,
      message: "Database error occurred"
    });
  });
};

// ULTRA SIMPLE VERSION - Get recent patients
exports.getRecentPatients = (req, res) => {
  const doctorId = req.user.user_id;

  // console.log('\n========================================');
  // console.log('GET RECENT PATIENTS - DETAILED DEBUG');
  // console.log('========================================');
  // console.log('Doctor ID:', doctorId);

  // Super simple query - just get appointments
  const query = `
    SELECT 
      a.patient_id,
      u.name as patient_name,
      u.email as patient_email,
      u.phone as patient_phone,
      a.appointment_date as last_appointment,
      a.status,
      a.appointment_time
    FROM appointments a
    JOIN users u ON a.patient_id = u.user_id
    WHERE a.doctor_id = ?
    ORDER BY a.appointment_date DESC, a.created_at DESC
    LIMIT 10
  `;
  
  connection.query(query, [doctorId], (err, results) => {
    if (err) {
      console.error("❌ ERROR fetching recent patients:", err);
      return res.status(500).json({
        success: false,
        message: "Database error occurred"
      });
    }
    
    // console.log('\n📊 RAW QUERY RESULTS:');
    // console.log('Total appointments found:', results.length);
    // console.log('\nFull results:');
    // console.log(JSON.stringify(results, null, 2));
    
    // Group by patient and get most recent
    const patientsMap = new Map();
    
    results.forEach(row => {
      const patientId = row.patient_id;
      
      if (!patientsMap.has(patientId)) {
        // console.log('\n➕ Adding patient:', row.patient_name);
        // console.log('  - Patient ID:', patientId);
        // console.log('  - Last appointment (raw):', row.last_appointment);
        // console.log('  - Status:', row.status);
        
        patientsMap.set(patientId, {
          patient_id: row.patient_id,
          patient_name: row.patient_name,
          patient_email: row.patient_email,
          patient_phone: row.patient_phone,
          last_appointment: row.last_appointment,
          total_visits: 0
        });
      }
    });
    
    const patients = Array.from(patientsMap.values()).slice(0, 3);
    
    // console.log('\n✅ FINAL PATIENTS TO SEND:');
    // console.log('Count:', patients.length);
    // patients.forEach((p, i) => {
    //   console.log(`\nPatient ${i + 1}:`);
    //   console.log('  Name:', p.patient_name);
    //   console.log('  Last appointment:', p.last_appointment);
    //   console.log('  Type of last_appointment:', typeof p.last_appointment);
    // });
    // console.log('========================================\n');
    
    res.json({
      success: true,
      patients: patients
    });
  });
};