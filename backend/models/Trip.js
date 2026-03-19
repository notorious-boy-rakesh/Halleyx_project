const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true },
  truckId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Truck', required: true },
  driverId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Trip details
  origin:      { type: String, required: true },
  destination: { type: String, required: true },
  freightType: { type: String },
  weightTons:  { type: Number },
  
  // Financial expected vs actual
  expectedRevenue: { type: Number, required: true },
  expectedFuelCost: { type: Number, default: 0 },
  expectedTollCost: { type: Number, default: 0 },
  expectedOtherCost:{ type: Number, default: 0 },
  
  // Actuals computed by Expense Intelligence
  actualFuelCost: { type: Number, default: 0 },
  actualTollCost: { type: Number, default: 0 },
  actualOtherCost:{ type: Number, default: 0 },
  totalActualCost:{ type: Number, default: 0 },
  currentProfit:  { type: Number, default: 0 },

  // Execution tracking (replacing classic Execution model)
  currentStepId: { type: mongoose.Schema.Types.ObjectId, ref: 'Step' },
  status: {
    type: String,
    enum: ['pending', 'running', 'success', 'failed', 'paused'],
    default: 'pending'
  },
  startedAt:  Date,
  finishedAt: Date,
  durationMs: { type: Number, default: 0 },
  testMode:   { type: Boolean, default: false },
  
  error: { type: String },
  stepHistory: [{
    stepId: { type: mongoose.Schema.Types.ObjectId, ref: 'Step' },
    enteredAt: { type: Date },
    leftAt: { type: Date }
  }]
}, { timestamps: true });

tripSchema.index({ driverId: 1, status: 1 });
tripSchema.index({ truckId: 1, status: 1 });

module.exports = mongoose.model('Trip', tripSchema);
