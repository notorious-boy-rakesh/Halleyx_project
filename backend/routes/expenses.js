const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const protect = require('../middleware/auth');

router.use(protect);

router.get('/', expenseController.getExpenses);

// Drivers log expenses
router.post('/', expenseController.logExpense);

module.exports = router;
