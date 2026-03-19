const Alert = require('../models/Alert');
const Trip = require('../models/Trip');

/**
 * Checks an expense against anomaly rules and historical patterns.
 * Designed to act as the Fraud/Anomaly Detection layer.
 */
exports.checkExpenseAnomaly = async (expense) => {
  const trip = await Trip.findById(expense.tripId);
  if (!trip) return false;

  let isAnomalous = false;
  let reason = '';
  let severity = 'Low';
  let alertType = 'ExpenseSpike';

  // Rule 1: Late Entry Check (Fraud Detection)
  if (['success', 'failed'].includes(trip.status)) {
    isAnomalous = true;
    reason = 'Expense unexpectedly logged AFTER trip completion.';
    severity = 'High';
    alertType = 'LateEntry';
  }

  // Rule 2: Fuel Spike Alert (Fuel exceeds 150% of expected)
  if (!isAnomalous && expense.category === 'Fuel' && trip.expectedFuelCost > 0) {
    if (trip.actualFuelCost > trip.expectedFuelCost * 1.5) {
      isAnomalous = true;
      reason = `Total fuel cost ($${trip.actualFuelCost}) exceeds expected ($${trip.expectedFuelCost}) by over 50%.`;
      severity = 'High';
      alertType = 'ExpenseSpike';
    }
  }
  
  // Rule 3: Single massive anomaly expense
  if (!isAnomalous && expense.amount > 3000) {
     isAnomalous = true;
     reason = `Unusually large single operational expense: $${expense.amount}`;
     severity = 'Critical';
     alertType = 'ExpenseSpike';
  }

  // Record Anomaly
  if (isAnomalous) {
    expense.isAnomalous = true;
    expense.anomalyReason = reason;
    await expense.save();

    await Alert.create({
      tripId: trip._id,
      driverId: expense.driverId,
      expenseId: expense._id,
      type: alertType,
      severity,
      message: reason
    });

    // Automatically trigger driver score recalculation asynchronously
    const scoringEngine = require('./scoringEngine');
    scoringEngine.recalculateDriverScore(expense.driverId).catch(console.error);
  }

  return isAnomalous;
};
