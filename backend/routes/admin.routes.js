const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { verifyToken, isAdminRole } = require("../middleware/auth");

router.get("/admin/dashboard-stats",        verifyToken, isAdminRole, adminController.getDashboardStats);
router.get("/admin/users",                  verifyToken, isAdminRole, adminController.getAllUsers);
router.get("/admin/users/:userId",          verifyToken, isAdminRole, adminController.getUserDetail);
router.delete("/admin/users/:userId",       verifyToken, isAdminRole, adminController.deleteUser);
router.get("/admin/analytics/demographics", verifyToken, isAdminRole, adminController.getAnalyticsDemographics);
router.get("/admin/analytics/appointments", verifyToken, isAdminRole, adminController.getAnalyticsAppointments);
router.get("/admin/analytics/doctors",      verifyToken, isAdminRole, adminController.getAnalyticsDoctors);
router.get("/admin/research",               verifyToken, isAdminRole, adminController.getResearchData);
router.get("/admin/export/:type",           verifyToken, isAdminRole, adminController.exportData);

module.exports = router;