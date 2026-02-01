const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { verifyToken } = require("../middleware/auth");

router.get("/current-user", verifyToken, userController.getCurrentUser);
router.get("/verify", verifyToken, userController.verifyToken);

module.exports = router;