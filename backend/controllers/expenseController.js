const Expense = require('../models/Expense');
const expenseEngine = require('../services/expenseEngine');
const anomalyEngine = require('../services/anomalyEngine');

exports.getExpenses = async (req, res, next) => {
  try {
    const filter = req.user.role === 'driver' ? { driverId: req.user._id } : {};
    if (req.query.tripId) filter.tripId = req.query.tripId;
    
    const expenses = await Expense.find(filter)
      .populate('tripId', 'origin destination')
      .populate('driverId', 'name')
      .sort({ date: -1 });
    res.json({ success: true, count: expenses.length, data: expenses });
  } catch(err) { next(err); }
};

exports.logExpense = async (req, res, next) => {
  try {
    const expenseData = { ...req.body, driverId: req.user._id };
    const expense = await Expense.create(expenseData);
    
    // 1. Recalculate financial profit tally for the trip intelligently
    await expenseEngine.recalculateTripFinance(expense.tripId);
    
    // 2. Run Anomaly and Fraud check
    await anomalyEngine.checkExpenseAnomaly(expense);
    
    // Fetch the updated expense with anomaly flags if any were added
    const finalExpense = await Expense.findById(expense._id);
    
    res.status(201).json({ success: true, data: finalExpense });
  } catch(err) { next(err); }
};
