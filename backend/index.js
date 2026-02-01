require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

const { PORT } = require("./config/constants");
const connection = require("./config/database");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const patientRoutes = require("./routes/patient.routes");
const doctorRoutes = require("./routes/doctor.routes");
const appointmentRoutes = require("./routes/appointment.routes");
const documentRoutes = require("./routes/document.routes");
const forgotPasswordRoutes = require("./routes/forgotPassword.routes");

const app = express();

// ================= MIDDLEWARE =================
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use("/api/forgot-password", forgotPasswordRoutes);
app.use('/api/doctor', doctorRoutes);

// ================= STATIC FILES =================
app.use(express.static(path.join(__dirname, "..")));

// ================= HTML ROUTES =================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "html", "login.html"));
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "html", "login.html"));
});

app.get("/register.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "html", "register.html"));
});

app.get("/doctor-dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "html", "doctor-dashboard.html"));
});

app.get("/patient-dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "html", "patient-dashboard.html"));
});

app.get("/patient-profile.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "html", "patient-profile.html"));
});

app.get("/doctor-profile.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "html", "doctor-profile.html"));
});

app.get("/doctor-directory.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "html", "doctor-directory.html"));
});

app.get("/medical-reports.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "html", "medical-reports.html"));
});

app.get("/search-patients.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "html", "search-patients.html"));
});

app.get("/appointments.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "html", "appointments.html"));
});

app.get("/patients.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "html", "patients.html"));
});

app.get("/forgot-password.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "html", "forgot-password.html"));
});

// ================= API ROUTES =================
app.use("/", authRoutes);
app.use("/api", userRoutes);
app.use("/api", patientRoutes);
app.use("/api", doctorRoutes);
app.use("/api", appointmentRoutes);
app.use("/api", documentRoutes);

// ================= ERROR HANDLING =================
app.use(errorHandler);

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// ================= GRACEFUL SHUTDOWN =================
process.on("SIGINT", () => {
  console.log("\n⏳ Closing database connection...");
  connection.end((err) => {
    if (err) {
      console.error("Error closing connection:", err);
    } else {
      console.log("✅ Database connection closed");
    }
    process.exit(0);
  });
});