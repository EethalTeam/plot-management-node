const jwt = require("jsonwebtoken");

// Best-effort actor extraction for activity logging. middlewares/authMiddleware.js
// now blocks unauthenticated requests on protected routes and sets req.user,
// so prefer that when present; this still does its own decode as a fallback
// for the handful of public routes (webhooks, login) it never runs on, where
// a missing/invalid token just means the log entry has no actor, never a 401.
function getActorId(req) {
  if (req.user?._id) return req.user._id;

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    return decoded._id || null;
  } catch {
    return null;
  }
}

module.exports = { getActorId };
