const Trip = require('../models/Trip');
const executionEngine = require('../services/executionEngine');

exports.getTrips = async (req, res, next) => {
  try {
    // Role based filtering
    const filter = req.user.role === 'driver' ? { driverId: req.user._id } : {};
    const trips = await Trip.find(filter)
      .populate('truckId', 'registrationNumber make model')
      .populate('driverId', 'name email driverLabel driverScore')
      .populate('currentStepId', 'name type')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: trips.length, data: trips });
  } catch(err) { next(err); }
};

exports.getTrip = async (req, res, next) => {
  try {
    const filter = req.user.role === 'driver' ? { _id: req.params.id, driverId: req.user._id } : { _id: req.params.id };
    const trip = await Trip.findOne(filter)
      .populate('truckId')
      .populate('driverId')
      .populate('workflowId')
      .populate('currentStepId');
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    res.json({ success: true, data: trip });
  } catch(err) { next(err); }
};

exports.createTrip = async (req, res, next) => {
  try {
    const trip = await Trip.create(req.body);
    // Start the workflow execution instantly
    const startedTrip = await executionEngine.run(trip._id);
    res.status(201).json({ success: true, data: startedTrip });
  } catch(err) { next(err); }
};

// Manually un-pause or continue a trip (e.g. after a manual approval)
exports.continueTrip = async (req, res, next) => {
  try {
    const trip = await executionEngine.run(req.params.id);
    res.json({ success: true, data: trip });
  } catch(err) { next(err); }
};
