/** GET /api/user/profile  (req.user is set by the protect middleware) */
exports.getProfile = (req, res) => {
  res.json({ user: req.user });
};
