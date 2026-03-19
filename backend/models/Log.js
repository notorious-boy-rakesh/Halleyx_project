const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  executionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Execution',
    required: true
  },
  stepId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Step',
    default: null
  },
  stepName: { type: String, default: 'System' },
  stepType: { type: String, default: '' },
  // What happened at this step
  action:  { type: String, required: true },
  // Outcome of the action
  result:  { type: String, enum: ['success', 'failure', 'skipped', 'info'], default: 'info' },
  // Which rule was matched (if any)
  matchedRule:  { type: String, default: null },
  matchedCond:  { type: String, default: null },
  // Routing decision
  decision: { type: String, default: null },
  // Execution time for this step in ms
  duration: { type: Number, default: 0 },
  // Extra metadata
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Error details if failed
  error:    { type: String, default: null },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: false });

logSchema.index({ executionId: 1, timestamp: 1 });

module.exports = mongoose.model('Log', logSchema);
