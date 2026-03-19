const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const protect = require('../middleware/auth');
const requireRole = require('../middleware/rbac');

router.use(protect);

// Dashboards and general anomalies restricted to admin/manager
router.use(requireRole('admin', 'manager'));

router.get('/dashboard', analyticsController.getDashboardKPIs);
router.get('/drivers', analyticsController.getDriverScores);
router.get('/alerts', analyticsController.getAlerts);

module.exports = router;
