const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { verificationTtlHours } = require('../config/env');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true, // unique index also protects against race conditions
      lowercase: true,
      trim: true,
    },
    // select:false => never returned by queries unless explicitly requested
    password: { type: String, required: true, select: false },
    isVerified: { type: Boolean, default: false },
    // We store only the SHA-256 hash of the verification token.
    // If the DB leaks, the raw token (which is in the email) can't be reconstructed.
    verificationTokenHash: { type: String, select: false },
    verificationTokenExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

// Hash password whenever it is set/changed.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

/**
 * Creates a random, single-use, time-limited verification token.
 * Returns the RAW token (to email to the user); only its hash is stored.
 * Caller must call user.save() afterwards.
 */
userSchema.methods.createVerificationToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex'); // 64 hex chars
  this.verificationTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.verificationTokenExpires = new Date(Date.now() + verificationTtlHours * 60 * 60 * 1000);
  return rawToken;
};

// Safety net: strip sensitive fields from any JSON output.
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.verificationTokenHash;
    delete ret.verificationTokenExpires;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
