const router  = require('express').Router();
const auth    = require('../middleware/auth');
const requireRole = require('../middleware/rbac');
const ctrl    = require('../controllers/authController');

router.post('/register', ctrl.register);
router.post('/login',    ctrl.login);
router.get('/me',        auth, ctrl.getMe);
router.get('/users',     auth, requireRole('admin'), ctrl.getUsers);

module.exports = router;
