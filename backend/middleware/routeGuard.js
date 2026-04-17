const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/constants");

const guardRoute = (...allowedRoles) => (req, res, next) => {
  const token = req.cookies.authToken;

  if (!token) {
    return res.redirect("/login.html");
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.redirect("/login.html");
    }
    if (!allowedRoles.includes(decoded.role)) {
      // Send them to their correct dashboard, not to an unauthorised one
      const redirectMap = {
        doctor:  "/doctor-dashboard.html",
        patient: "/patient-dashboard.html",
        admin:   "/admin-dashboard.html",
      };
      return res.redirect(redirectMap[decoded.role] || "/login.html");
    }
    next();
  });
};

module.exports = guardRoute;