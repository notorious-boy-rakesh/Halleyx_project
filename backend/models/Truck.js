const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema({
  registrationNumber: { type: String, required: true, unique: true },
  make: { type: String },
  model: { type: String },
  capacityTons: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Available', 'In Transit', 'Maintenance', 'Out of Service'],
    default: 'Available'
  },
  currentDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastMaintenanceDate: Date,
  mileage: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Truck', truckSchema);
