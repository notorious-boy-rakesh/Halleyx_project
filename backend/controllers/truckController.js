const Truck = require('../models/Truck');

exports.getTrucks = async (req, res, next) => {
  try {
    const trucks = await Truck.find().populate('currentDriver', 'name email driverScore');
    res.json({ success: true, count: trucks.length, data: trucks });
  } catch (err) { next(err); }
};

exports.getTruck = async (req, res, next) => {
  try {
    const truck = await Truck.findById(req.params.id);
    if (!truck) return res.status(404).json({ success: false, message: 'Truck not found' });
    res.json({ success: true, data: truck });
  } catch (err) { next(err); }
};

exports.createTruck = async (req, res, next) => {
  try {
    const truck = await Truck.create(req.body);
    res.status(201).json({ success: true, data: truck });
  } catch (err) { next(err); }
};

exports.updateTruck = async (req, res, next) => {
  try {
    const truck = await Truck.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!truck) return res.status(404).json({ success: false, message: 'Truck not found' });
    res.json({ success: true, data: truck });
  } catch (err) { next(err); }
};
