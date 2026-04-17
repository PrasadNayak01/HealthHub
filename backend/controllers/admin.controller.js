const connection = require("../config/database");

// ── Dashboard overview ───────────────────────────────────────────────────────

exports.getDashboardStats = (req, res) => {
  const queries = [
    "SELECT COUNT(*) as c FROM users WHERE role='patient'",
    "SELECT COUNT(*) as c FROM users WHERE role='doctor'",
    "SELECT COUNT(*) as c FROM appointments",
    "SELECT COUNT(*) as c FROM appointments WHERE status IN ('completed','done')",
    "SELECT COUNT(*) as c FROM appointments WHERE status='pending'",
    "SELECT COALESCE(SUM(amount),0) as c FROM payments WHERE payment_status='paid'",
    "SELECT COUNT(*) as c FROM patient_documents",
    "SELECT COUNT(*) as c FROM users WHERE DATE(created_at)=CURDATE()",
    // FIXED: removed 'u.' alias prefix — no JOIN here, just plain column names
    `SELECT user_id, name, email, role, created_at FROM users WHERE role!='admin' ORDER BY created_at DESC LIMIT 8`,
    `SELECT DATE_FORMAT(created_at,'%Y-%m') as m, SUM(role='patient') as patients, SUM(role='doctor') as doctors
     FROM users WHERE created_at>=DATE_SUB(NOW(),INTERVAL 6 MONTH) GROUP BY m ORDER BY m`,
    `SELECT status, COUNT(*) as c FROM appointments GROUP BY status`,
    `SELECT DATE_FORMAT(appointment_date,'%Y-%m') as m, COUNT(*) as total,
     SUM(status IN('completed','done')) as completed
     FROM appointments WHERE appointment_date>=DATE_SUB(NOW(),INTERVAL 6 MONTH)
     GROUP BY m ORDER BY m`
  ];

  Promise.all(queries.map(q => new Promise((resolve, reject) =>
    connection.query(q, (err, r) => err ? reject(err) : resolve(r))
  )))
  .then(([pts, docs, apts, comp, pend, rev, pdocs, today, recentUsers, monthly, aptStatus, aptMonthly]) => {
    res.json({
      success: true,
      stats: {
        totalPatients: pts[0].c,
        totalDoctors: docs[0].c,
        totalAppointments: apts[0].c,
        completedAppointments: comp[0].c,
        pendingAppointments: pend[0].c,
        totalRevenue: rev[0].c,
        totalDocuments: pdocs[0].c,
        todayRegistrations: today[0].c
      },
      recentUsers,
      monthlyRegistrations: monthly,
      appointmentsByStatus: aptStatus,
      appointmentsByMonth: aptMonthly
    });
  })
  .catch(err => {
    console.error("Admin dashboard error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  });
};

// ── User management ──────────────────────────────────────────────────────────

exports.getAllUsers = (req, res) => {
  const { role, search, page = 1, limit = 25 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];

  let where = "WHERE u.role != 'admin'";
  if (role && role !== 'all') { where += " AND u.role=?"; params.push(role); }
  if (search) {
    where += " AND (u.name LIKE ? OR u.email LIKE ? OR u.user_id LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const countQ = `SELECT COUNT(*) as total FROM users u ${where}`;
  const dataQ = `
    SELECT u.user_id, u.name, u.email, u.phone, u.role, u.created_at,
      dp.speciality,
      pp.age, pp.gender, pp.blood_group,
      (SELECT COUNT(*) FROM appointments a
       WHERE (u.role='doctor' AND a.doctor_id=u.user_id)
          OR (u.role='patient' AND a.patient_id=u.user_id)) as appointment_count
    FROM users u
    LEFT JOIN doctor_profiles dp ON u.user_id=dp.doctor_id AND u.role='doctor'
    LEFT JOIN patient_profiles pp ON u.user_id=pp.patient_id AND u.role='patient'
    ${where}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `;

  connection.query(countQ, params, (err, countRes) => {
    if (err) return res.status(500).json({ success: false, message: "DB error" });
    connection.query(dataQ, [...params, parseInt(limit), offset], (err, users) => {
      if (err) return res.status(500).json({ success: false, message: "DB error" });
      res.json({
        success: true, users,
        pagination: {
          total: countRes[0].total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(countRes[0].total / parseInt(limit))
        }
      });
    });
  });
};

exports.getUserDetail = (req, res) => {
  const { userId } = req.params;
  const userQ = "SELECT user_id, name, email, phone, role, created_at FROM users WHERE user_id=?";
  connection.query(userQ, [userId], (err, users) => {
    if (err || !users.length) return res.status(404).json({ success: false, message: "User not found" });
    const user = users[0];

    const profileQ = user.role === 'doctor'
      ? "SELECT * FROM doctor_profiles WHERE doctor_id=?"
      : "SELECT age,gender,blood_group,weight,height,address,medical_history,allergies,current_medications FROM patient_profiles WHERE patient_id=?";

    connection.query(profileQ, [userId], (err, profile) => {
      const aptQ = user.role === 'doctor'
        ? "SELECT COUNT(*) as c FROM appointments WHERE doctor_id=?"
        : "SELECT COUNT(*) as c FROM appointments WHERE patient_id=?";
      connection.query(aptQ, [userId], (err, aptCount) => {
        res.json({
          success: true,
          user,
          profile: profile[0] || null,
          appointmentCount: aptCount[0]?.c || 0
        });
      });
    });
  });
};

exports.deleteUser = (req, res) => {
  const { userId } = req.params;
  connection.query("SELECT role FROM users WHERE user_id=?", [userId], (err, r) => {
    if (err || !r.length) return res.status(404).json({ success: false, message: "User not found" });
    if (r[0].role === 'admin') return res.status(403).json({ success: false, message: "Cannot delete admin users" });
    connection.query("DELETE FROM users WHERE user_id=?", [userId], (err) => {
      if (err) return res.status(500).json({ success: false, message: "DB error" });
      res.json({ success: true, message: "User deleted successfully" });
    });
  });
};

// ── Demographics analytics ───────────────────────────────────────────────────

exports.getAnalyticsDemographics = (req, res) => {
  const qs = [
    "SELECT gender, COUNT(*) as count FROM patient_profiles WHERE gender IS NOT NULL GROUP BY gender",
    // FIXED: wrapped CASE in subquery with explicit alias to avoid GROUP BY ambiguity
    `SELECT grp AS group_label, COUNT(*) as count FROM (
       SELECT CASE
         WHEN age < 18 THEN 'Under 18'
         WHEN age BETWEEN 18 AND 30 THEN '18–30'
         WHEN age BETWEEN 31 AND 45 THEN '31–45'
         WHEN age BETWEEN 46 AND 60 THEN '46–60'
         ELSE 'Above 60'
       END AS grp
       FROM patient_profiles WHERE age IS NOT NULL
     ) t GROUP BY grp ORDER BY FIELD(grp,'Under 18','18–30','31–45','46–60','Above 60')`,
    "SELECT blood_group, COUNT(*) as count FROM patient_profiles WHERE blood_group IS NOT NULL GROUP BY blood_group ORDER BY count DESC",
    `SELECT cat AS category, COUNT(*) as count FROM (
       SELECT CASE
         WHEN weight < 50 THEN 'Underweight'
         WHEN weight BETWEEN 50 AND 70 THEN 'Normal'
         WHEN weight BETWEEN 71 AND 90 THEN 'Overweight'
         ELSE 'Obese'
       END AS cat
       FROM patient_profiles WHERE weight IS NOT NULL
     ) t GROUP BY cat`,
    "SELECT medical_history FROM patient_profiles WHERE medical_history IS NOT NULL AND medical_history!=''",
    "SELECT allergies FROM patient_profiles WHERE allergies IS NOT NULL AND allergies!=''",
    `SELECT
       SUM(pp.patient_id IS NOT NULL) as complete,
       SUM(pp.patient_id IS NULL) as incomplete
     FROM users u
     LEFT JOIN patient_profiles pp ON u.user_id = pp.patient_id
     WHERE u.role = 'patient'`
  ];

  Promise.all(qs.map(q => new Promise((res, rej) =>
    connection.query(q, (e, r) => e ? rej(e) : res(r))
  )))
  .then(([gender, ageGroups, bloodGroups, weightCategories, medHistory, allergies, profileCompletion]) => {
    const DISEASE_KEYWORDS = [
      'diabetes','hypertension','asthma','tuberculosis','tb','malaria','dengue',
      'typhoid','hepatitis','anemia','thyroid','cancer','heart disease','kidney',
      'liver disease','respiratory','infection','arthritis','depression','anxiety',
      'epilepsy','migraine','back pain','joint pain','cholesterol','fever'
    ];
    const allMed = medHistory.map(r => r.medical_history.toLowerCase()).join(' ');
    const diseaseBurden = DISEASE_KEYWORDS.map(k => ({
      disease: k.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      patients: medHistory.filter(r => r.medical_history.toLowerCase().includes(k)).length,
      mentions: (allMed.match(new RegExp(k, 'g')) || []).length
    })).filter(d => d.patients > 0).sort((a, b) => b.patients - a.patients).slice(0, 15);

    const ALLERGY_KEYWORDS = ['penicillin','sulfa','aspirin','ibuprofen','latex','peanut','shellfish','dust','pollen','mold'];
    const allAllergy = allergies.map(r => r.allergies.toLowerCase()).join(' ');
    const allergyFrequency = ALLERGY_KEYWORDS.map(k => ({
      allergen: k.charAt(0).toUpperCase() + k.slice(1),
      count: allergies.filter(r => r.allergies.toLowerCase().includes(k)).length
    })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      demographics: {
        gender,
        ageGroups,
        bloodGroups,
        weightCategories,
        diseaseBurden,
        allergyFrequency,
        profileCompletion: profileCompletion[0]
      }
    });
  })
  .catch(err => {
    console.error("Demographics analytics error:", err);
    res.status(500).json({ success: false, message: "DB error" });
  });
};

// ── Appointment analytics ────────────────────────────────────────────────────

exports.getAnalyticsAppointments = (req, res) => {
  const { startDate, endDate } = req.query;
  // FIXED: build date filter safely using parameterised queries instead of string interpolation
  const hasDateFilter = startDate && endDate;

  const baseFilter = hasDateFilter ? ' AND a.appointment_date BETWEEN ? AND ?' : '';
  const plainFilter = hasDateFilter ? ' AND appointment_date BETWEEN ? AND ?' : '';
  const dateParams  = hasDateFilter ? [startDate, endDate] : [];

  const qs = [
    {
      sql: `SELECT status, COUNT(*) as count FROM appointments WHERE 1=1${plainFilter} GROUP BY status`,
      params: dateParams
    },
    {
      sql: `SELECT DAYNAME(appointment_date) as day, DAYOFWEEK(appointment_date) as dow, COUNT(*) as count
            FROM appointments WHERE 1=1${plainFilter} GROUP BY day, dow ORDER BY dow`,
      params: dateParams
    },
    {
      sql: `SELECT dp.speciality, COUNT(*) as count
            FROM appointments a
            JOIN doctor_profiles dp ON a.doctor_id = dp.doctor_id
            WHERE dp.speciality IS NOT NULL${baseFilter}
            GROUP BY dp.speciality ORDER BY count DESC LIMIT 10`,
      params: dateParams
    },
    {
      sql: `SELECT DATE_FORMAT(appointment_date,'%Y-%m') as month,
                   COUNT(*) as total,
                   SUM(status IN('completed','done')) as completed
            FROM appointments
            WHERE appointment_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY month ORDER BY month`,
      params: []
    },
    {
      sql: `SELECT payment_method, payment_status, COUNT(*) as count,
                   COALESCE(SUM(amount), 0) as amount
            FROM payments GROUP BY payment_method, payment_status`,
      params: []
    },
    {
      sql: `SELECT dp.speciality,
                   ROUND(AVG(dp.consultation_fee), 0) as avg_fee,
                   COUNT(a.appointment_id) as appointments
            FROM doctor_profiles dp
            LEFT JOIN appointments a ON dp.doctor_id = a.doctor_id
            WHERE dp.speciality IS NOT NULL
            GROUP BY dp.speciality ORDER BY appointments DESC LIMIT 10`,
      params: []
    },
    {
      sql: `SELECT TIME_FORMAT(appointment_time,'%H:00') as hour, COUNT(*) as count
            FROM appointments
            WHERE appointment_time IS NOT NULL${plainFilter}
            GROUP BY hour ORDER BY hour`,
      params: dateParams
    }
  ];

  Promise.all(qs.map(({ sql, params }) => new Promise((resolve, reject) =>
    connection.query(sql, params, (e, r) => e ? reject(e) : resolve(r))
  )))
  .then(([byStatus, byDay, bySpecialty, byMonth, byPayment, feeBySpecialty, byHour]) => {
    res.json({
      success: true,
      analytics: { byStatus, byDay, bySpecialty, byMonth, byPayment, feeBySpecialty, byHour }
    });
  })
  .catch(err => {
    console.error("Appointment analytics error:", err);
    res.status(500).json({ success: false, message: "DB error" });
  });
};

// ── Doctor performance analytics ─────────────────────────────────────────────

exports.getAnalyticsDoctors = (req, res) => {
  const q = `
    SELECT
  u.user_id, 
  u.name, 
  u.email, 
  u.created_at,
  dp.speciality, 
  dp.experience, 
  dp.consultation_fee,

  COUNT(DISTINCT a.appointment_id) as total_appointments,

  COUNT(DISTINCT CASE 
    WHEN a.status IN ('completed','done') 
    THEN a.appointment_id 
  END) as completed,

  COUNT(DISTINCT a.patient_id) as unique_patients,

  COALESCE(SUM(DISTINCT CASE 
    WHEN p.payment_status = 'paid' 
    THEN p.amount 
  END), 0) as revenue

FROM users u

LEFT JOIN doctor_profiles dp 
  ON u.user_id = dp.doctor_id

LEFT JOIN appointments a 
  ON u.user_id = a.doctor_id

LEFT JOIN payments p 
  ON a.appointment_id = p.appointment_id

WHERE u.role = 'doctor'

GROUP BY 
  u.user_id, u.name, u.email, u.created_at,
  dp.speciality, dp.experience, dp.consultation_fee

ORDER BY total_appointments DESC; 
  `;
  connection.query(q, (err, r) => {
    if (err) return res.status(500).json({ success: false, message: "DB error" });
    res.json({ success: true, doctors: r });
  });
};

// ── Research data ────────────────────────────────────────────────────────────

exports.getResearchData = (req, res) => {
  const qs = [
    "SELECT medical_history FROM patient_profiles WHERE medical_history IS NOT NULL AND medical_history!=''",
    `SELECT pp.age, COUNT(a.appointment_id) as appointments
     FROM patient_profiles pp
     JOIN appointments a ON pp.patient_id = a.patient_id
     WHERE pp.age IS NOT NULL
     GROUP BY pp.age ORDER BY pp.age`,
    `SELECT dp.speciality, COUNT(a.appointment_id) as demand
     FROM doctor_profiles dp
     JOIN appointments a ON dp.doctor_id = a.doctor_id
     GROUP BY dp.speciality ORDER BY demand DESC`,
    `SELECT DATE_FORMAT(a.appointment_date,'%Y-%m') as month, a.notes, dp.speciality
     FROM appointments a
     JOIN doctor_profiles dp ON a.doctor_id = dp.doctor_id
     WHERE a.notes IS NOT NULL AND a.notes != ''
       AND a.appointment_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)`,
    `SELECT pp.blood_group, AVG(pp.age) as avg_age, COUNT(*) as count
     FROM patient_profiles pp WHERE pp.blood_group IS NOT NULL GROUP BY pp.blood_group`,
    `SELECT pp.gender, AVG(pp.age) as avg_age, AVG(pp.weight) as avg_weight, AVG(pp.height) as avg_height
     FROM patient_profiles pp WHERE pp.gender IS NOT NULL GROUP BY pp.gender`
  ];

  Promise.all(qs.map(q => new Promise((resolve, reject) =>
    connection.query(q, (e, r) => e ? reject(e) : resolve(r))
  )))
  .then(([medHistories, ageVsApts, specialtyDemand, aptNotes, bloodAgeData, genderStats]) => {
    const KEYWORDS = [
      'diabetes','hypertension','asthma','tuberculosis','malaria','dengue',
      'typhoid','hepatitis','anemia','thyroid','cancer','heart','kidney',
      'liver','respiratory','infection','arthritis','depression','anxiety',
      'epilepsy','migraine','cholesterol'
    ];
    const allMed = medHistories.map(r => r.medical_history.toLowerCase()).join(' ');
    const diseaseBurden = KEYWORDS.map(k => ({
      disease: k.charAt(0).toUpperCase() + k.slice(1),
      profileMentions: medHistories.filter(r => r.medical_history.toLowerCase().includes(k)).length,
      textFrequency: (allMed.match(new RegExp(k, 'g')) || []).length
    })).filter(d => d.profileMentions > 0).sort((a, b) => b.profileMentions - a.profileMentions);

    const allNotes = aptNotes.map(r => r.notes.toLowerCase()).join(' ');
    const clinicalDisease = KEYWORDS.map(k => ({
      disease: k.charAt(0).toUpperCase() + k.slice(1),
      clinicalMentions: (allNotes.match(new RegExp(k, 'g')) || []).length
    })).filter(d => d.clinicalMentions > 0).sort((a, b) => b.clinicalMentions - a.clinicalMentions);

    res.json({
      success: true,
      research: { diseaseBurden, clinicalDisease, ageVsApts, specialtyDemand, bloodAgeData, genderStats }
    });
  })
  .catch(err => {
    console.error("Research data error:", err);
    res.status(500).json({ success: false, message: "DB error" });
  });
};

// ── CSV Export ───────────────────────────────────────────────────────────────

exports.exportData = (req, res) => {
  const { type } = req.params;
  const queries = {
    patients: {
      q: `SELECT u.user_id, u.name, u.email, u.phone,
               pp.age, pp.gender, pp.blood_group,
               pp.weight, pp.height, pp.medical_history,
               pp.allergies, pp.current_medications,
               u.created_at,
               (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = u.user_id) as total_appointments
          FROM users u
          LEFT JOIN patient_profiles pp ON u.user_id = pp.patient_id
          WHERE u.role = 'patient'
          ORDER BY u.created_at DESC`,
      file: 'patients_export.csv'
    },
    appointments: {
      q: `SELECT a.appointment_id,
               p.name as patient_name, p.email as patient_email,
               d.name as doctor_name, dp.speciality,
               a.appointment_date, a.appointment_time,
               a.status, a.payment_method, a.payment_status,
               a.notes, a.created_at
          FROM appointments a
          JOIN users p ON a.patient_id = p.user_id
          JOIN users d ON a.doctor_id = d.user_id
          LEFT JOIN doctor_profiles dp ON a.doctor_id = dp.doctor_id
          ORDER BY a.appointment_date DESC`,
      file: 'appointments_export.csv'
    },
    doctors: {
      q: `SELECT u.user_id, u.name, u.email, u.phone,
               dp.speciality, dp.degree, dp.experience,
               dp.consultation_fee, dp.address,
               (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = u.user_id) as total_appointments,
               (SELECT COUNT(DISTINCT patient_id) FROM patient_records pr WHERE pr.doctor_id = u.user_id) as unique_patients,
               u.created_at
          FROM users u
          LEFT JOIN doctor_profiles dp ON u.user_id = dp.doctor_id
          WHERE u.role = 'doctor'
          ORDER BY u.created_at DESC`,
      file: 'doctors_export.csv'
    }
  };

  if (!queries[type]) return res.status(400).json({ success: false, message: "Invalid export type" });

  connection.query(queries[type].q, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: "DB error" });
    if (!rows.length) {
      res.setHeader('Content-Type', 'text/csv');
      return res.send('');
    }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => {
        const v = r[h] == null ? '' : String(r[h]).replace(/"/g, '""');
        return (v.includes(',') || v.includes('\n') || v.includes('"')) ? `"${v}"` : v;
      }).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${queries[type].file}"`);
    res.send(csv);
  });
};