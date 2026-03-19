const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/ruleController');

const requireRole = require('../middleware/rbac');

router.use(auth);
router.use(requireRole('admin', 'manager'));

router.post('/validate',   ctrl.validateCondition);
router.post('/ai-suggest', ctrl.aiSuggest);
router.post('/test',       ctrl.testCondition);
router.get('/',            ctrl.getRules);
router.get('/:id',         ctrl.getRule);
router.post('/',           ctrl.createRule);
router.put('/:id',         ctrl.updateRule);
router.delete('/:id',      ctrl.deleteRule);

module.exports = router;
