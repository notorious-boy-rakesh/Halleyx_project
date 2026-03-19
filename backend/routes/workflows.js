const router  = require('express').Router();
const auth    = require('../middleware/auth');
const requireRole = require('../middleware/rbac');
const ctrl    = require('../controllers/workflowController');

router.use(auth);
router.use(requireRole('admin', 'manager'));

router.get('/stats/overview',         ctrl.getStats);
router.get('/',                       ctrl.getWorkflows);
router.get('/:id',                    ctrl.getWorkflow);
router.post('/',                      ctrl.createWorkflow);
router.put('/:id',                    ctrl.updateWorkflow);
router.delete('/:id',                 ctrl.deleteWorkflow);
router.post('/:id/save-version',      ctrl.saveVersion);
router.post('/:id/rollback/:versionNumber', ctrl.rollback);

module.exports = router;
