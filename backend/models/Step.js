const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  workflowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Step name is required'],
    trim: true,
    maxlength: [200, 'Step name cannot exceed 200 characters']
  },
  // Step types
  type: {
    type: String,
    enum: ['task', 'approval', 'notification'],
    required: true
  },
  // Flexible config object — varies by type
  config: {
    // task: { action, params }
    // approval: { approverRole, message }
    // notification: { channel, recipient, subject, body }
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Execution order within the workflow
  order: {
    type: Number,
    required: true,
    default: 0
  },
  // For marking first/last steps
  isStart: { type: Boolean, default: false },
  isEnd:   { type: Boolean, default: false },
  // Retry configuration
  retryLimit: { type: Number, default: 0 },
  // Visual position for builder canvas
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Compound index for efficient lookup by workflow
stepSchema.index({ workflowId: 1, order: 1 });

module.exports = mongoose.model('Step', stepSchema);
