const { v4: uuidv4 } = require("uuid");

const generateUserId = (userType) => {
  return userType === "patient" ? `PID-${uuidv4()}` : `DOC-${uuidv4()}`;
};

const generateDocumentId = () => {
  return `DOC-${uuidv4()}`;
};

const generateAppointmentId = () => {
  return `APT-${uuidv4()}`;
};

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

module.exports = {
  generateUserId,
  generateDocumentId,
  generateAppointmentId,
  getTodayDate
};