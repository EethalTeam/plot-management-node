const jwt = require("jsonwebtoken");

// Best-effort actor extraction for activity logging only — this does NOT
// gate access (the app deliberately has no blocking auth middleware yet), so
// a missing/invalid token just means the log entry has no actor, never a 401.
function getActorId(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET || "9@B!7eD#v^3Qp2LmZ$Wk1X%tRg6N*oYu8hGlDd4Ci");
    return decoded._id || null;
  } catch {
    return null;
  }
}

module.exports = { getActorId };
