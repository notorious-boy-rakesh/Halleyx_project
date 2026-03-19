const Workflow  = require('../models/Workflow');
const Step      = require('../models/Step');
const Rule      = require('../models/Rule');
const Trip      = require('../models/Trip');
const Log       = require('../models/Log');
const ruleEngine = require('./ruleEngine');

const MAX_STEPS = 100; // Infinite loop guard

/**
 * Execution Engine
 * Drives a trip workflow execution from start to finish
 */
class ExecutionEngine {

  /**
   * Start or resume an execution
   * @param {ObjectId|string} tripId
   * @returns {Object} final trip document
   */
  async run(tripId) {
    const trip = await Trip.findById(tripId);
    if (!trip) throw new Error('Trip not found');
    if (trip.status === 'success' || trip.status === 'failed') {
      return trip;
    }

    // Load all steps for this workflow
    const steps = await Step.find({ workflowId: trip.workflowId, isActive: true })
                            .sort({ order: 1 });
    if (!steps.length) {
      return await this._fail(trip, 'No active steps found in workflow.');
    }

    // Find starting step or current step
    let currentStep;
    if (trip.currentStepId) {
       currentStep = steps.find(s => s._id.toString() === trip.currentStepId.toString());
    } else {
       currentStep = steps.find(s => s.isStart) || steps[0];
    }
    
    if (!currentStep) return await this._fail(trip, 'Invalid step configuration.');

    // Mark execution as running if not already
    if (trip.status === 'pending') {
      trip.status = 'running';
      trip.startedAt = new Date();
    }
    trip.currentStepId = currentStep._id;
    await trip.save();

    await this._log(trip._id, null, 'Trip execution running', 'info', {
      origin: trip.origin, destination: trip.destination, testMode: trip.testMode
    });

    let stepCount = 0;
    const evaluatedTripData = trip.toObject(); // Base context for rule engine

    while (currentStep) {
      if (++stepCount > MAX_STEPS) {
        return await this._fail(trip, `Infinite loop detected after ${MAX_STEPS} steps.`);
      }

      const stepStart = Date.now();

      // Execute the step action
      let stepResult;
      try {
        stepResult = await this._executeStep(currentStep, trip);
      } catch (err) {
        await this._log(trip._id, currentStep._id, `Step error: ${err.message}`, 'failure',
          {}, currentStep.name, currentStep.type, null, null, null, Date.now() - stepStart, err.message);

        return await this._fail(trip, `Step "${currentStep.name}" failed: ${err.message}`);
      }

      // Track step history
      trip.stepHistory.push({ stepId: currentStep._id, enteredAt: new Date(), leftAt: new Date() });

      // If this is an end step
      if (currentStep.isEnd) {
        await this._log(trip._id, currentStep._id, 'Final step reached', 'success',
          stepResult, currentStep.name, currentStep.type, null, null, 'Trip complete', Date.now() - stepStart);
        break;
      }

      // If Approval step, pause workflow & wait for manual continuation API
      if (currentStep.type === 'approval') {
         trip.status = 'paused'; // Waits for Manual Action by Manager
         await trip.save();
         await this._log(trip._id, currentStep._id, 'Waiting for human approval', 'info');
         return trip; 
      }

      // Fetch rules for this step sorted by priority
      const rules = await Rule.find({ stepId: currentStep._id, isActive: true })
                              .sort({ priority: 1 });

      let matchedRule = null;
      let nextStepId  = null;

      for (const rule of rules) {
        // Evaluate conditions using the live Trip data
        const matched = ruleEngine.evaluate(rule.condition, evaluatedTripData);
        if (matched) {
          matchedRule = rule;
          nextStepId  = rule.nextStepId;
          break;
        }
      }

      await this._log(
        trip._id, currentStep._id,
        matchedRule ? `Rule matched: "${matchedRule.condition}"` : 'No rule matched – ending flow',
        'success',
        stepResult,
        currentStep.name,
        currentStep.type,
        matchedRule ? matchedRule._id.toString() : null,
        matchedRule ? matchedRule.condition : null,
        matchedRule ? (nextStepId ? `Go to step ${nextStepId}` : 'End logic') : 'No rule – end',
        Date.now() - stepStart
      );

      if (!nextStepId) break; 

      const nextStep = steps.find(s => s._id.toString() === nextStepId.toString());
      if (!nextStep) return await this._fail(trip, `Next step ${nextStepId} not found.`);
      
      currentStep = nextStep;
      trip.currentStepId = currentStep._id;
      await trip.save();
    }

    // Mark trip as complete
    trip.status     = 'success';
    trip.finishedAt = new Date();
    trip.durationMs = trip.finishedAt - trip.startedAt;
    trip.currentStepId = null;
    await trip.save();

    await this._updateStats(trip.workflowId, 'success', trip.durationMs);
    await this._log(trip._id, null, 'Trip execution completed successfully', 'info');

    return await Trip.findById(tripId);
  }

  async _executeStep(step, trip) {
    const cfg = step.config || {};

    switch (step.type) {
      case 'task':
        return { action: cfg.action || 'task_executed', params: cfg.params || {}, simulated: true };
      
      case 'notification':
        if (!trip.testMode) {
          try {
            const notifService = require('./notificationService');
            await notifService.send({
              channel:   cfg.channel   || 'ui',
              recipient: cfg.recipient || '',
              subject:   cfg.subject   || `Trip Step: ${step.name}`,
              body:      cfg.body      || `Step "${step.name}" executed for Trip.`,
              data:      trip.toObject()
            });
          } catch (e) {
            console.warn('[ExecutionEngine] Notification error:', e.message);
          }
        }
        return { notified: true };

      default:
        return { executed: true };
    }
  }

  async _fail(trip, reason) {
    trip.status     = 'failed';
    trip.finishedAt = new Date();
    trip.error      = reason;
    await trip.save();
    
    await this._updateStats(trip.workflowId, 'failure', 0);
    await this._log(trip._id, null, `Trip failed: ${reason}`, 'failure');
    return await Trip.findById(trip._id);
  }

  async _log(executionId, stepId, action, result, metadata = {}, stepName = 'System',
              stepType = '', matchedRule = null, matchedCond = null, decision = null,
              duration = 0, error = null) {
    try {
      await Log.create({
        executionId, // For compatibility tracking
        stepId:      stepId || null,
        stepName,
        stepType,
        action,
        result,
        matchedRule,
        matchedCond,
        decision,
        duration,
        metadata,
        error,
        timestamp: new Date()
      });
    } catch (e) {
      console.error('[ExecutionEngine] Logging error:', e.message);
    }
  }

  async _updateStats(workflowId, outcome, durationMs) {
    try {
      const workflow = await Workflow.findById(workflowId);
      if (!workflow) return;
      workflow.stats.totalExecutions++;
      if (outcome === 'success') workflow.stats.successCount++;
      else                       workflow.stats.failureCount++;
      const prev = workflow.stats.avgDurationMs * (workflow.stats.totalExecutions - 1);
      workflow.stats.avgDurationMs = Math.round((prev + durationMs) / workflow.stats.totalExecutions);
      await workflow.save();
    } catch (e) {
      // Ignore stat failures
    }
  }
}

module.exports = new ExecutionEngine();
