require("dotenv").config();

const express      = require("express");
const bodyParser   = require("body-parser");
const cookieParser = require("cookie-parser");
const cors         = require("cors");
const path         = require("path");

const { PORT }        = require("./config/constants");
const connection      = require("./config/database");
const errorHandler    = require("./middleware/errorHandler");
const guardRoute      = require("./middleware/routeGuard");   // ← new

const authRoutes           = require("./routes/auth.routes");
const userRoutes           = require("./routes/user.routes");
const patientRoutes        = require("./routes/patient.routes");
const doctorRoutes         = require("./routes/doctor.routes");
const appointmentRoutes    = require("./routes/appointment.routes");
const documentRoutes       = require("./routes/document.routes");
const forgotPasswordRoutes = require("./routes/forgotPassword.routes");
const paymentRoutes        = require("./routes/payment.routes");
const adminRoutes          = require("./routes/admin.routes");

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// Static assets (css / js / assets folders) — no auth needed
app.use("/css",    express.static(path.join(__dirname, "..", "css")));
app.use("/js",     express.static(path.join(__dirname, "..", "js")));
app.use("/assets", express.static(path.join(__dirname, "..", "assets")));

// ── Public routes ────────────────────────────────────────────────────────────
app.get("/",                  (_req, res) => res.sendFile(path.join(__dirname, "..", "html", "login.html")));
app.get("/login.html",        (_req, res) => res.sendFile(path.join(__dirname, "..", "html", "login.html")));
app.get("/register.html",     (_req, res) => res.sendFile(path.join(__dirname, "..", "html", "register.html")));
app.get("/forgot-password.html", (_req, res) => res.sendFile(path.join(__dirname, "..", "html", "forgot-password.html")));

// ── Doctor-only routes ────────────────────────────────────────────────────────
const serveDoctor = guardRoute("doctor");
app.get("/doctor-dashboard.html", serveDoctor, (_req, res) => res.sendFile(path.join(__dirname, "..", "html", "doctor-dashboard.html")));
app.get("/doctor-profile.html",   serveDoctor, (_req, res) => res.sendFile(path.join(__dirname, "..", "html", "doctor-profile.html")));
app.get("/search-patients.html",  serveDoctor, (_req, res) => res.sendFile(path.join(__dirname, "..", "html", "search-patients.html")));
app.get("/appointments.html",     serveDoctor, (_req, res) => res.sendFile(path.join(__dirname, "..", "html", "appointments.html")));
app.get("/patients.html",         serveDoctor, (_req, res) => res.sendFile(path.join(__dirname, "..", "html", "patients.html")));

// ── Patient-only routes ───────────────────────────────────────────────────────
const servePatient = guardRoute("patient");
app.get("/patient-dashboard.html",  servePatient, (_req, res) => res.sendFile(path.join(__dirname, "..", "html", "patient-dashboard.html")));
app.get("/patient-profile.html",    servePatient, (_req, res) => res.sendFile(path.join(__dirname, "..", "html", "patient-profile.html")));
app.get("/doctor-directory.html",   servePatient, (_req, res) => res.sendFile(path.join(__dirname, "..", "html", "doctor-directory.html")));
app.get("/medical-reports.html",    servePatient, (_req, res) => res.sendFile(path.join(__dirname, "..", "html", "medical-reports.html")));

// ── Admin-only routes ─────────────────────────────────────────────────────────
const serveAdmin = guardRoute("admin");
app.get("/admin-dashboard.html", serveAdmin, (_req, res) => res.sendFile(path.join(__dirname, "..", "html", "admin-dashboard.html")));
app.get("/admin-users.html",     serveAdmin, (_req, res) => res.sendFile(path.join(__dirname, "..", "html", "admin-users.html")));
app.get("/admin-analytics.html", serveAdmin, (_req, res) => res.sendFile(path.join(__dirname, "..", "html", "admin-analytics.html")));

// ── Shared pages ──────────────────────────────────────────────────────────────
app.get("/payment-complete.html", (_req, res) => res.sendFile(path.join(__dirname, "..", "html", "payment-complete.html")));
app.get("/payment-cancel.html",   (_req, res) => res.sendFile(path.join(__dirname, "..", "html", "payment-cancel.html")));

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/",    authRoutes);
app.use("/api", userRoutes);
app.use("/api", patientRoutes);
app.use("/api", doctorRoutes);
app.use("/api", appointmentRoutes);
app.use("/api", documentRoutes);
app.use("/api/forgot-password", forgotPasswordRoutes);
app.use("/api", paymentRoutes);
app.use("/api", adminRoutes);

app.use(errorHandler);

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

process.on("SIGINT", () => {
  connection.end((err) => {
    if (err) console.error("Error closing connection:", err);
    process.exit(0);
  });
});