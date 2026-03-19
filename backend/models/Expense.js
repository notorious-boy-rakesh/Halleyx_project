const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  tripId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  category: {
    type: String,
    enum: ['Fuel', 'Toll', 'Food', 'Repair', 'Other'],
    required: true
  },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  
  location: { type: String },
  receiptUrl: { type: String },
  notes: { type: String },
  
  // Set by Anomaly Engine
  isAnomalous: { type: Boolean, default: false },
  anomalyReason: { type: String }
}, { timestamps: true });

expenseSchema.index({ tripId: 1 });
expenseSchema.index({ driverId: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
