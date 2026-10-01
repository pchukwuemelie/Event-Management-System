const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendVerificationEmail } = require('../utils/email');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

// Used to keep login timing similar whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);

const signToken = (userId) =>
  jwt.sign({ sub: userId }, jwtSecret, { algorithm: 'HS256', expiresIn: jwtExpiresIn });

/** POST /api/auth/register */
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (await User.findOne({ email })) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const user = new User({ name, email, password }); // password hashed in pre-save hook
  const rawToken = user.createVerificationToken();
  await user.save();

  let emailSent = true;
  try {
    await sendVerificationEmail(user, rawToken);
  } catch (err) {
    emailSent = false;
    console.error('Failed to send verification email:', err.message);
  }

  res.status(201).json({
    message: emailSent
      ? 'Registration successful. Check your email to verify your account.'
      : 'Registration successful, but the verification email could not be sent. Use /api/auth/resend-verification.',
    user,
  });
});

/** GET /api/auth/verify-email?token=... */
exports.verifyEmail = asyncHandler(async (req, res) => {
  const tokenHash = crypto.createHash('sha256').update(req.query.token).digest('hex');

  // Match on hash AND unexpired in one query.
  const user = await User.findOne({
    verificationTokenHash: tokenHash,
    verificationTokenExpires: { $gt: new Date() },
  }).select('+verificationTokenHash +verificationTokenExpires');

  if (!user) {
    throw new ApiError(400, 'Verification link is invalid or has expired');
  }

  user.isVerified = true;
  user.verificationTokenHash = undefined; // single use
  user.verificationTokenExpires = undefined;
  await user.save();

  res.json({ message: 'Email verified successfully. You can now log in.' });
});

/** POST /api/auth/resend-verification  (always returns the same response to avoid email enumeration) */
exports.resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (user && !user.isVerified) {
    const rawToken = user.createVerificationToken(); // replaces any previous token
    await user.save();
    try {
      await sendVerificationEmail(user, rawToken);
    } catch (err) {
      console.error('Failed to resend verification email:', err.message);
    }
  }

  res.json({ message: 'If that account exists and is unverified, a new verification email has been sent.' });
});

/** POST /api/auth/login */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  // Always run a bcrypt compare so response time doesn't reveal whether the email exists.
  const passwordOk = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

  if (!user || !passwordOk) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isVerified) {
    throw new ApiError(403, 'Please verify your email before logging in');
  }

  res.json({ message: 'Login successful', token: signToken(user.id), user });
});
