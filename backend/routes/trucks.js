const express = require('express');
const router = express.Router();
const truckController = require('../controllers/truckController');
const protect = require('../middleware/auth');
const requireRole = require('../middleware/rbac');

router.use(protect);

router.get('/', truckController.getTrucks);
router.get('/:id', truckController.getTruck);

router.post('/', requireRole('admin', 'manager'), truckController.createTruck);
router.put('/:id', requireRole('admin', 'manager'), truckController.updateTruck);

module.exports = router;
