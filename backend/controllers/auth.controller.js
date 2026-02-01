const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const connection = require("../config/database");
const { JWT_SECRET, JWT_EXPIRY, COOKIE_MAX_AGE } = require("../config/constants");
const { validateRegistration, validateLogin, validateDoctorEmail } = require("../validators/validators");
const { generateUserId } = require("../utils/helpers");

exports.register = (req, res) => {
  const validation = validateRegistration(req.body);
  
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.message,
    });
  }

  const { userType, name, email, phone, password } = req.body;

  connection.query(
    "SELECT email FROM users WHERE email = ?",
    [email],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Database error occurred",
        });
      }

      if (result.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error("Hashing error:", err);
          return res.status(500).json({
            success: false,
            message: "Error processing password",
          });
        }

        const user = {
          user_id: generateUserId(userType),
          role: userType,
          name: name,
          email: email,
          phone: phone,
          password: hashedPassword,
          confirm_password: hashedPassword,
        };

        connection.query("INSERT INTO users SET ?", user, (err) => {
          if (err) {
            console.error("Insert error:", err);
            return res.status(500).json({
              success: false,
              message: "Error creating user account",
            });
          }

          res.json({
            success: true,
            message: "Registration successful! Please login.",
          });
        });
      });
    }
  );
};

exports.login = (req, res) => {
  const validation = validateLogin(req.body);
  
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.message,
    });
  }

  const { email, password } = req.body;

  connection.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Database error occurred",
        });
      }

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const user = result[0];

      if (user.role === 'doctor' && !validateDoctorEmail(email)) {
        return res.status(403).json({
          success: false,
          message: "Invalid doctor email. Only @healthhub.com emails are allowed for doctors.",
        });
      }

      bcrypt.compare(password, user.password, (err, match) => {
        if (err) {
          console.error("Password comparison error:", err);
          return res.status(500).json({
            success: false,
            message: "Error verifying password",
          });
        }

        if (!match) {
          return res.status(401).json({
            success: false,
            message: "Invalid password",
          });
        }

        const token = jwt.sign(
          {
            user_id: user.user_id,
            email: user.email,
            role: user.role,
            name: user.name,
            phone: user.phone
          },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRY }
        );

        res.cookie("authToken", token, {
          httpOnly: true,
          maxAge: COOKIE_MAX_AGE,
          sameSite: "lax",
          path: "/",
        });

        res.json({
          success: true,
          message: "Login successful",
          user: {
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
          },
          redirect:
            user.role === "doctor"
              ? "/doctor-dashboard.html"
              : "/patient-dashboard.html",
        });
      });
    }
  );
};

exports.logout = (req, res) => {
  res.clearCookie("authToken", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  res.json({
    success: true,
    message: "Logged out successfully",
  });
};