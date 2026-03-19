const Log = require('../models/Log');

/**
 * GET /api/logs?executionId=xxx
 */
exports.getLogs = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.executionId) filter.executionId = req.query.executionId;

    const logs = await Log.find(filter)
      .populate('executionId', 'workflowId status')
      .populate('stepId', 'name type')
      .sort({ timestamp: 1 })
      .limit(500);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) { next(err); }
};

/**
 * GET /api/logs/recent
 */
exports.getRecentLogs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await Log.find()
      .populate('executionId', 'workflowId status')
      .sort({ timestamp: -1 })
      .limit(limit);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) { next(err); }
};
