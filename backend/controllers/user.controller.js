const connection = require("../config/database");

exports.getCurrentUser = (req, res) => {
  connection.query(
    "SELECT user_id, name, email, phone, role FROM users WHERE user_id = ?",
    [req.user.user_id],
    (err, result) => {
      if (err || result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        user: result[0],
      });
    }
  );
};

exports.verifyToken = (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
};