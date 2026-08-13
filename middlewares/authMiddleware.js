// Blocking JWT authentication for the whole /api surface. Before this, the
// app had no auth middleware at all (see the old comment in utils/getActor.js)
// — every route responded to anyone who could reach the server, logged in or
// not. This is mounted as the very first /api-scoped middleware in server.js
// so it runs ahead of every route, direct or router-mounted, regardless of
// registration order elsewhere.
//
// A handful of paths must stay reachable without a user token because
// nothing capable of holding one calls them:
//   - /Auth/login              — you can't present a token before you have one.
//   - /fetchCallLogs           — the Sollu IVR PBX posts call logs here directly.
//   - /whatsapp/webhook        — Meta's servers call this; the POST variant is
//                                 already protected by its own HMAC signature
//                                 check (middlewares/whatsappSignature.js), not JWT.
//   - /lead_documents/*        — served via express.static and opened with a
//                                 plain window.open()/browser navigation
//                                 (DealDocuments.jsx), which can't attach a
//                                 custom Authorization header. Left as a known
//                                 gap rather than silently broken; fixing this
//                                 properly needs signed/expiring URLs, not a
//                                 Bearer-token check.
const jwt = require("jsonwebtoken");

const PUBLIC_PATHS = ["/Auth/login", "/fetchCallLogs", "/whatsapp/webhook"];
const PUBLIC_PREFIXES = ["/lead_documents/"];

function isPublicPath(path) {
  if (PUBLIC_PATHS.includes(path)) return true;
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

module.exports = function authMiddleware(req, res, next) {
  if (isPublicPath(req.path)) return next();

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired session — please log in again." });
  }
};
