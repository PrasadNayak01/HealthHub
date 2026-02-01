const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/constants");

const verifyToken = (req, res, next) => {
  const token = req.cookies.authToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
    req.user = decoded;
    next();
  });
};

const isDoctorRole = (req, res, next) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only doctors can access this endpoint."
    });
  }
  next();
};

const isPatientRole = (req, res, next) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only patients can access this endpoint."
    });
  }
  next();
};

module.exports = { verifyToken, isDoctorRole, isPatientRole };