const Joi = require('joi');

// At least 8 chars, letters + digits only, containing at least one letter and one digit.
// (bcrypt only uses the first 72 bytes, so cap the length.)
const password = Joi.string()
  .min(8)
  .max(72)
  .pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/)
  .required()
  .messages({
    'string.pattern.base': 'Password must be alphanumeric and contain at least one letter and one number',
  });

const email = Joi.string().trim().lowercase().email().max(254).required();

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email,
  password,
});

// Login only checks shape; we don't leak password rules there.
const loginSchema = Joi.object({
  email,
  password: Joi.string().max(72).required(),
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().hex().length(64).required(),
});

const resendSchema = Joi.object({ email });

module.exports = { registerSchema, loginSchema, verifyEmailSchema, resendSchema };
