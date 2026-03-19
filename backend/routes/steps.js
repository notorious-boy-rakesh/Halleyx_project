const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/stepController');

router.get('/',           auth, ctrl.getSteps);
router.get('/:id',        auth, ctrl.getStep);
router.post('/',          auth, ctrl.createStep);
router.put('/:id',        auth, ctrl.updateStep);
router.delete('/:id',     auth, ctrl.deleteStep);
router.post('/reorder',   auth, ctrl.reorderSteps);

module.exports = router;
