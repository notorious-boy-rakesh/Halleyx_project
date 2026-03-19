const Trip = require('../models/Trip');
const Alert = require('../models/Alert');
const User = require('../models/User');

exports.getDashboardKPIs = async (req, res, next) => {
  try {
    // Role filtering not strictly applied to high-level KPIs unless needed
    const trips = await Trip.find();
    const alerts = await Alert.find();
    
    const totalTrips = trips.length;
    const activeTrips = trips.filter(t => t.status === 'running' || t.status === 'paused').length;
    const completedTrips = trips.filter(t => t.status === 'success').length;
    
    const totalProfit = trips.reduce((acc, t) => acc + (t.currentProfit || 0), 0);
    const totalExpectedProfit = trips.reduce((acc, t) => {
        const cost = (t.expectedFuelCost || 0) + (t.expectedTollCost || 0) + (t.expectedOtherCost || 0);
        return acc + (t.expectedRevenue - cost);
    }, 0);

    const totalAnomalies = alerts.length;
    const unresolvedAnomalies = alerts.filter(a => !a.resolved).length;
    
    res.json({
      success: true, 
      data: {
        totalTrips, activeTrips, completedTrips,
        totalProfit, totalExpectedProfit, totalAnomalies, unresolvedAnomalies
      }
    });
  } catch(err) { next(err); }
};

exports.getDriverScores = async (req, res, next) => {
  try {
    const drivers = await User.find({ role: 'driver' }).select('name email driverScore driverLabel totalTripsCompleted totalAnomaliesTriggered').sort({ driverScore: -1 });
    res.json({ success: true, data: drivers });
  } catch(err) { next(err); }
};

exports.getAlerts = async (req, res, next) => {
  try {
    const alerts = await Alert.find()
      .populate('driverId', 'name driverScore')
      .populate({ path: 'expenseId', select: 'amount category' })
      .populate('tripId', 'origin destination status')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: alerts });
  } catch(err) { next(err); }
};
