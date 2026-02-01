const { DOCTOR_EMAIL_DOMAIN } = require("../config/constants");

const validateDoctorEmail = (email) => {
  return email.toLowerCase().endsWith(DOCTOR_EMAIL_DOMAIN);
};

const validateRegistration = (data) => {
  const { userType, name, email, phone, password, confirmPassword } = data;

  if (!userType || !name || !email || !phone || !password || !confirmPassword) {
    return { valid: false, message: "All fields are required" };
  }

  if (userType === 'doctor' && !validateDoctorEmail(email)) {
    return { 
      valid: false, 
      message: `Doctors must register with an ${DOCTOR_EMAIL_DOMAIN} email address` 
    };
  }

  if (password !== confirmPassword) {
    return { valid: false, message: "Passwords do not match" };
  }

  if (password.length < 6) {
    return { valid: false, message: "Password must be at least 6 characters" };
  }

  return { valid: true };
};

const validateLogin = (data) => {
  const { email, password } = data;

  if (!email || !password) {
    return { valid: false, message: "Email and password are required" };
  }

  return { valid: true };
};

module.exports = {
  validateDoctorEmail,
  validateRegistration,
  validateLogin
};