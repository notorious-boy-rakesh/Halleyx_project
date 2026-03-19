const Trip = require('../models/Trip');
const Expense = require('../models/Expense');

/**
 * Recomputes financial tallies for a Trip based on all its Expenses
 */
exports.recalculateTripFinance = async (tripId) => {
  const trip = await Trip.findById(tripId);
  if (!trip) return null;

  const expenses = await Expense.find({ tripId });
  
  let actualFuel = 0, actualToll = 0, actualOther = 0;
  
  expenses.forEach(e => {
    if (e.category === 'Fuel') actualFuel += e.amount;
    else if (e.category === 'Toll') actualToll += e.amount;
    else actualOther += e.amount;
  });

  trip.actualFuelCost = actualFuel;
  trip.actualTollCost = actualToll;
  trip.actualOtherCost = actualOther;
  trip.totalActualCost = actualFuel + actualToll + actualOther;
  
  // Profit = Revenue - Total Cost
  trip.currentProfit = trip.expectedRevenue - trip.totalActualCost;
  
  await trip.save();
  return trip;
};
