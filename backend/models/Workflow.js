const mongoose = require('mongoose');

// Schema for a workflow version snapshot
const versionSchema = new mongoose.Schema({
  versionNumber: Number,
  snapshot: mongoose.Schema.Types.Mixed, // stores serialized workflow+steps+rules
  savedAt: { type: Date, default: Date.now },
  savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note: String
});

const workflowSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Workflow name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  version: {
    type: Number,
    default: 1
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{ type: String, trim: true }],
  // Version control history
  versions: [versionSchema],
  // Stats cache (updated on each execution finish)
  stats: {
    totalExecutions: { type: Number, default: 0 },
    successCount:    { type: Number, default: 0 },
    failureCount:    { type: Number, default: 0 },
    avgDurationMs:   { type: Number, default: 0 }
  },
  // Webhook settings
  webhookEnabled: { type: Boolean, default: false },
  webhookSecret:  { type: String, default: '' }
}, { timestamps: true });

// Virtual: success rate
workflowSchema.virtual('successRate').get(function() {
  if (this.stats.totalExecutions === 0) return 0;
  return Math.round((this.stats.successCount / this.stats.totalExecutions) * 100);
});

workflowSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Workflow', workflowSchema);
