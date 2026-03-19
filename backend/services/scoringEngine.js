const User = require('../models/User');
const Trip = require('../models/Trip');
const Alert = require('../models/Alert');

/**
 * Evaluates driver performance across efficiency, discipline, and profitability
 */
exports.recalculateDriverScore = async (driverId) => {
  const driver = await User.findById(driverId);
  // Optional check if roles exist: if (!driver || driver.role !== 'driver') return null;
  if (!driver) return null;

  const trips = await Trip.find({ driverId, status: 'success' });
  const alerts = await Alert.find({ driverId });

  const totalTrips = trips.length;
  const totalAnomalies = alerts.length;
  
  // Base starting score
  let score = 10.0;

  // Penalty: Safety / Form compliance violations
  alerts.forEach(a => {
    if (a.severity === 'Critical') score -= 1.5;
    else if (a.severity === 'High') score -= 1.0;
    else score -= 0.5;
  });

  // Reward: Completion volume
  score += (totalTrips * 0.2);

  // Profitability Metric: expected vs actual margins
  let totalExpectedProfit = 0;
  let totalActualProfit = 0;

  trips.forEach(t => {
     const expectedCost = (t.expectedFuelCost || 0) + (t.expectedTollCost || 0) + (t.expectedOtherCost || 0);
     totalExpectedProfit += (t.expectedRevenue - expectedCost);
     totalActualProfit += t.currentProfit;
  });

  if (totalExpectedProfit > 0) {
    if (totalActualProfit < totalExpectedProfit * 0.7) {
       // Driver eroded >30% of margin
       score -= 2.0;
    } else if (totalActualProfit > totalExpectedProfit * 1.05) {
       // Driver saved substantial money on road
       score += 1.0;
    }
  }

  // Mathematically clamp score
  score = Math.max(0, Math.min(10, score));

  // Determine Categorical Label
  let driverLabel;
  if (score >= 9) driverLabel = 'Exceptional';
  else if (score >= 7) driverLabel = 'Efficient';
  else if (score >= 5) driverLabel = 'Average';
  else if (score >= 3) driverLabel = 'Risky';
  else driverLabel = 'Probation';

  // Apply updates
  driver.driverScore = parseFloat(score.toFixed(1));
  driver.driverLabel = driverLabel;
  driver.totalTripsCompleted = totalTrips;
  driver.totalAnomaliesTriggered = totalAnomalies;

  await driver.save();
  return driver;
};
