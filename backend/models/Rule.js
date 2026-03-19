const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  stepId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Step',
    required: true
  },
  workflowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true
  },
  // Human-readable label
  name: {
    type: String,
    trim: true,
    default: ''
  },
  // Condition expression string, e.g. "amount > 100 && priority == 'High'"
  condition: {
    type: String,
    required: [true, 'Rule condition is required'],
    trim: true
  },
  // Target step when condition is true (null = end workflow)
  nextStepId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Step',
    default: null
  },
  // Lower number = higher priority (evaluated first)
  priority: {
    type: Number,
    default: 10
  },
  // Action to log when rule matches
  action: {
    type: String,
    default: 'proceed'
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Sort rules by priority when querying
ruleSchema.index({ stepId: 1, priority: 1 });

module.exports = mongoose.model('Rule', ruleSchema);
