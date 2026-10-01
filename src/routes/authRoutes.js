const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const auth = require('../controllers/authController');
const { registerSchema, loginSchema, verifyEmailSchema, resendSchema } = require('../validators/authValidators');

// Basic brute-force protection on auth endpoints.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests, please try again later' },
});
router.use(limiter);

router.post('/register', validate(registerSchema), auth.register);
router.post('/login', validate(loginSchema), auth.login);
router.get('/verify-email', validate(verifyEmailSchema, 'query'), auth.verifyEmail);
router.post('/resend-verification', validate(resendSchema), auth.resendVerification);

module.exports = router;
