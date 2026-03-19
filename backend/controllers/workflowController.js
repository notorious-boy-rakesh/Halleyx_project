const Workflow = require('../models/Workflow');
const Step     = require('../models/Step');
const Rule     = require('../models/Rule');

/**
 * GET /api/workflows
 */
exports.getWorkflows = async (req, res, next) => {
  try {
    const filter = { createdBy: req.user._id };
    if (req.user.role === 'admin') delete filter.createdBy; // Admin sees all

    const workflows = await Workflow.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ updatedAt: -1 });

    res.json({ success: true, count: workflows.length, data: workflows });
  } catch (err) { next(err); }
};

/**
 * GET /api/workflows/:id
 */
exports.getWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findById(req.params.id)
      .populate('createdBy', 'name email role');
    if (!workflow) return res.status(404).json({ success: false, message: 'Workflow not found.' });
    res.json({ success: true, data: workflow });
  } catch (err) { next(err); }
};

/**
 * POST /api/workflows
 */
exports.createWorkflow = async (req, res, next) => {
  try {
    const { name, description, tags } = req.body;
    const workflow = await Workflow.create({
      name, description, tags,
      createdBy: req.user._id
    });
    res.status(201).json({ success: true, message: 'Workflow created', data: workflow });
  } catch (err) { next(err); }
};

/**
 * PUT /api/workflows/:id
 */
exports.updateWorkflow = async (req, res, next) => {
  try {
    const { name, description, tags, isActive, webhookEnabled } = req.body;
    const workflow = await Workflow.findByIdAndUpdate(
      req.params.id,
      { name, description, tags, isActive, webhookEnabled },
      { new: true, runValidators: true }
    );
    if (!workflow) return res.status(404).json({ success: false, message: 'Workflow not found.' });
    res.json({ success: true, message: 'Workflow updated', data: workflow });
  } catch (err) { next(err); }
};

/**
 * DELETE /api/workflows/:id
 */
exports.deleteWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ success: false, message: 'Workflow not found.' });

    // Cascade delete steps and rules
    const steps = await Step.find({ workflowId: workflow._id });
    for (const step of steps) {
      await Rule.deleteMany({ stepId: step._id });
    }
    await Step.deleteMany({ workflowId: workflow._id });
    await Workflow.findByIdAndDelete(workflow._id);

    res.json({ success: true, message: 'Workflow and associated data deleted.' });
  } catch (err) { next(err); }
};

/**
 * POST /api/workflows/:id/save-version
 */
exports.saveVersion = async (req, res, next) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ success: false, message: 'Workflow not found.' });

    const steps = await Step.find({ workflowId: workflow._id });
    const stepIds = steps.map(s => s._id);
    const rules   = await Rule.find({ stepId: { $in: stepIds } });

    const snapshot = {
      workflow: workflow.toObject(),
      steps:    steps.map(s => s.toObject()),
      rules:    rules.map(r => r.toObject())
    };

    workflow.versions.push({
      versionNumber: workflow.version,
      snapshot,
      savedBy: req.user._id,
      note: req.body.note || `Version ${workflow.version}`
    });
    workflow.version += 1;
    await workflow.save();

    res.json({ success: true, message: `Version ${workflow.version - 1} saved.`, data: workflow });
  } catch (err) { next(err); }
};

/**
 * POST /api/workflows/:id/rollback/:versionNumber
 */
exports.rollback = async (req, res, next) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ success: false, message: 'Workflow not found.' });

    const vNum = parseInt(req.params.versionNumber);
    const ver  = workflow.versions.find(v => v.versionNumber === vNum);
    if (!ver) return res.status(404).json({ success: false, message: `Version ${vNum} not found.` });

    const { steps: oldSteps, rules: oldRules } = ver.snapshot;

    // Remove current steps/rules
    const currentSteps = await Step.find({ workflowId: workflow._id });
    for (const s of currentSteps) await Rule.deleteMany({ stepId: s._id });
    await Step.deleteMany({ workflowId: workflow._id });

    // Restore steps and rules
    for (const s of oldSteps) {
      const { _id, __v, ...stepData } = s;
      await Step.create({ ...stepData, _id });
    }
    for (const r of oldRules) {
      const { _id, __v, ...ruleData } = r;
      await Rule.create({ ...ruleData, _id });
    }

    res.json({ success: true, message: `Rolled back to version ${vNum}.` });
  } catch (err) { next(err); }
};

/**
 * GET /api/workflows/stats/overview
 */
exports.getStats = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    const workflows = await Workflow.find(filter);

    const totalWorkflows  = workflows.length;
    const totalExecutions = workflows.reduce((a, w) => a + w.stats.totalExecutions, 0);
    const totalSuccess    = workflows.reduce((a, w) => a + w.stats.successCount,    0);
    const totalFailed     = workflows.reduce((a, w) => a + w.stats.failureCount,    0);
    const avgDuration     = workflows.reduce((a, w) => a + w.stats.avgDurationMs,   0) / (workflows.length || 1);
    const successRate     = totalExecutions ? Math.round((totalSuccess / totalExecutions) * 100) : 0;

    res.json({
      success: true,
      data: { totalWorkflows, totalExecutions, totalSuccess, totalFailed, successRate, avgDuration: Math.round(avgDuration) }
    });
  } catch (err) { next(err); }
};
