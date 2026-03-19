const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/logController');

router.get('/',        auth, ctrl.getLogs);
router.get('/recent',  auth, ctrl.getRecentLogs);

module.exports = router;
