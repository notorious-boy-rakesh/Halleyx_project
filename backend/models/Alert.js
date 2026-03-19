const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },
  
  type: {
    type: String,
    enum: ['ExpenseSpike', 'LateEntry', 'RouteDeviation', 'WorkflowAnomaly'],
    required: true
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  message: { type: String, required: true },
  resolved: { type: Boolean, default: false },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date
}, { timestamps: true });

alertSchema.index({ resolved: 1, severity: 1 });

module.exports = mongoose.model('Alert', alertSchema);
