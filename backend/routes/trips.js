const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const protect = require('../middleware/auth');
const requireRole = require('../middleware/rbac');

router.use(protect);

router.get('/', tripController.getTrips);
router.get('/:id', tripController.getTrip);

// Only admins and managers create trips
router.post('/', requireRole('admin', 'manager'), tripController.createTrip);

// Manual workflow continuation (for human approval nodes)
router.post('/:id/continue', requireRole('admin', 'manager'), tripController.continueTrip);

module.exports = router;
