const multer = require("multer");

const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: "File size exceeds 10MB limit"
      });
    }
  }
  
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
};

module.exports = errorHandler;