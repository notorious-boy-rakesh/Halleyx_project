const Step = require('../models/Step');
const Rule = require('../models/Rule');

/**
 * GET /api/steps?workflowId=xxx
 */
exports.getSteps = async (req, res, next) => {
  try {
    const { workflowId } = req.query;
    if (!workflowId) return res.status(400).json({ success: false, message: 'workflowId is required.' });
    const steps = await Step.find({ workflowId, isActive: true }).sort({ order: 1 });
    res.json({ success: true, count: steps.length, data: steps });
  } catch (err) { next(err); }
};

/**
 * GET /api/steps/:id
 */
exports.getStep = async (req, res, next) => {
  try {
    const step = await Step.findById(req.params.id);
    if (!step) return res.status(404).json({ success: false, message: 'Step not found.' });
    res.json({ success: true, data: step });
  } catch (err) { next(err); }
};

/**
 * POST /api/steps
 */
exports.createStep = async (req, res, next) => {
  try {
    const { workflowId, name, type, config, order, isStart, isEnd, retryLimit, position } = req.body;
    const step = await Step.create({ workflowId, name, type, config, order, isStart, isEnd, retryLimit, position });
    res.status(201).json({ success: true, message: 'Step created', data: step });
  } catch (err) { next(err); }
};

/**
 * PUT /api/steps/:id
 */
exports.updateStep = async (req, res, next) => {
  try {
    const step = await Step.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!step) return res.status(404).json({ success: false, message: 'Step not found.' });
    res.json({ success: true, message: 'Step updated', data: step });
  } catch (err) { next(err); }
};

/**
 * DELETE /api/steps/:id
 */
exports.deleteStep = async (req, res, next) => {
  try {
    const step = await Step.findById(req.params.id);
    if (!step) return res.status(404).json({ success: false, message: 'Step not found.' });
    await Rule.deleteMany({ stepId: step._id });
    await Step.findByIdAndDelete(step._id);
    res.json({ success: true, message: 'Step and associated rules deleted.' });
  } catch (err) { next(err); }
};

/**
 * POST /api/steps/reorder  — bulk update step orders
 */
exports.reorderSteps = async (req, res, next) => {
  try {
    const { steps } = req.body; // [{ id, order }]
    for (const s of steps) {
      await Step.findByIdAndUpdate(s.id, { order: s.order });
    }
    res.json({ success: true, message: 'Steps reordered.' });
  } catch (err) { next(err); }
};
