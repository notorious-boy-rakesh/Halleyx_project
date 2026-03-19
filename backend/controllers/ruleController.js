const Rule       = require('../models/Rule');
const ruleEngine = require('../services/ruleEngine');

/**
 * GET /api/rules?stepId=xxx
 */
exports.getRules = async (req, res, next) => {
  try {
    const { stepId, workflowId } = req.query;
    const filter = {};
    if (stepId)     filter.stepId = stepId;
    if (workflowId) filter.workflowId = workflowId;

    const rules = await Rule.find(filter)
      .populate('nextStepId', 'name type')
      .sort({ priority: 1 });
    res.json({ success: true, count: rules.length, data: rules });
  } catch (err) { next(err); }
};

/**
 * GET /api/rules/:id
 */
exports.getRule = async (req, res, next) => {
  try {
    const rule = await Rule.findById(req.params.id).populate('nextStepId', 'name type');
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found.' });
    res.json({ success: true, data: rule });
  } catch (err) { next(err); }
};

/**
 * POST /api/rules
 */
exports.createRule = async (req, res, next) => {
  try {
    const { stepId, workflowId, name, condition, nextStepId, priority, action } = req.body;

    // Validate condition
    const validation = ruleEngine.validate(condition);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: `Invalid condition: ${validation.message}` });
    }

    const rule = await Rule.create({ stepId, workflowId, name, condition, nextStepId, priority, action });
    res.status(201).json({ success: true, message: 'Rule created', data: rule });
  } catch (err) { next(err); }
};

/**
 * PUT /api/rules/:id
 */
exports.updateRule = async (req, res, next) => {
  try {
    if (req.body.condition) {
      const validation = ruleEngine.validate(req.body.condition);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: `Invalid condition: ${validation.message}` });
      }
    }

    const rule = await Rule.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('nextStepId', 'name type');
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found.' });
    res.json({ success: true, message: 'Rule updated', data: rule });
  } catch (err) { next(err); }
};

/**
 * DELETE /api/rules/:id
 */
exports.deleteRule = async (req, res, next) => {
  try {
    const rule = await Rule.findByIdAndDelete(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found.' });
    res.json({ success: true, message: 'Rule deleted.' });
  } catch (err) { next(err); }
};

/**
 * POST /api/rules/validate
 * Validate a condition string without saving
 */
exports.validateCondition = async (req, res) => {
  const { condition } = req.body;
  const result = ruleEngine.validate(condition || '');
  res.json({ success: true, data: result });
};

/**
 * POST /api/rules/ai-suggest
 * Convert plain English text to condition strings
 */
exports.aiSuggest = async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, message: 'Text is required.' });

  const suggestions = ruleEngine.suggestCondition(text);
  res.json({ success: true, data: { suggestions, original: text } });
};

/**
 * POST /api/rules/test
 * Test a condition against sample data
 */
exports.testCondition = async (req, res) => {
  try {
    const { condition, data } = req.body;
    const validation = ruleEngine.validate(condition || '');
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: `Invalid condition: ${validation.message}` });
    }
    const result = ruleEngine.evaluate(condition, data || {});
    res.json({ success: true, data: { result, condition, inputData: data } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
