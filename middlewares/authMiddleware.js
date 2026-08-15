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
const SecuritySetting = require("../models/masterModels/SecuritySetting");

const PUBLIC_PATHS = ["/Auth/login", "/fetchCallLogs", "/whatsapp/webhook"];
const PUBLIC_PREFIXES = ["/lead_documents/"];

function isPublicPath(path) {
  if (PUBLIC_PATHS.includes(path)) return true;
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// Same webhook exemption as auth above — IP restriction is a client-network
// allowlist ("only our office can log in"), which must never apply to
// Meta/Sollu's own servers calling in from wherever they happen to run.
const IP_RESTRICTION_EXEMPT_PATHS = ["/fetchCallLogs", "/whatsapp/webhook"];

function isExemptFromIpRestriction(path) {
  return IP_RESTRICTION_EXEMPT_PATHS.includes(path) || PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// Strips the "::ffff:" IPv4-mapped-IPv6 prefix Node adds for IPv4 clients
// once app.set("trust proxy", ...) is on — otherwise a plain "127.0.0.1" or
// "203.0.113.5" entry in the allowlist would never match.
function normalizeIp(ip) {
  return ip?.startsWith("::ffff:") ? ip.slice(7) : ip;
}

// IPv4 only, deliberately — the real use case here is "restrict to our
// office's public IP," and business/office internet connections are
// overwhelmingly IPv4. A client connecting over IPv6 (no "::ffff:"-mapped
// IPv4 address to normalize) will fail to match any entry and be denied;
// proper IPv6 CIDR support (128-bit range math) is a real gap if that
// becomes a real scenario, not handled here.
function ipToInt(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
  return parts.reduce((acc, part) => acc * 256 + part, 0);
}

function isIpAllowed(ip, allowedIps) {
  const target = ipToInt(ip);
  if (target === null) return false;

  return allowedIps.some((entry) => {
    const [rangeIp, prefixStr] = entry.trim().split("/");
    const rangeInt = ipToInt(rangeIp);
    if (rangeInt === null) return false;
    if (prefixStr === undefined) return rangeInt === target;

    const prefix = Number(prefixStr);
    if (Number.isNaN(prefix) || prefix < 0 || prefix > 32) return false;
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (rangeInt & mask) === (target & mask);
  });
}

// Refetched at most once every 10s (not on every single request) — an
// admin-managed setting that changes rarely, so this trades a little
// propagation delay for avoiding a DB round trip per API call.
let cachedSetting = null;
let cachedAt = 0;
const CACHE_TTL_MS = 10_000;

async function getSecuritySetting() {
  if (cachedSetting && Date.now() - cachedAt < CACHE_TTL_MS) return cachedSetting;
  cachedSetting = await SecuritySetting.findOne();
  cachedAt = Date.now();
  return cachedSetting;
}

module.exports = async function authMiddleware(req, res, next) {
  // Checked ahead of (and independent from) the public-path/JWT logic below
  // — IP restriction is meant to gate login itself ("only our office network
  // can even sign in"), not just already-authenticated requests, so it must
  // not be skipped just because a path doesn't require a Bearer token.
  if (!isExemptFromIpRestriction(req.path)) {
    try {
      const setting = await getSecuritySetting();
      // An empty allowlist would otherwise block every request unconditionally
      // — almost certainly a misconfiguration (the toggle got flipped on
      // before any IP was added) rather than an intentional "block all
      // access" posture, so treat it as not-yet-active instead of a lockout.
      if (setting?.ipRestrictionEnabled && setting.allowedIps?.length > 0) {
        const clientIp = normalizeIp(req.ip);
        if (!isIpAllowed(clientIp, setting.allowedIps)) {
          return res.status(403).json({ message: "Access from this network is not allowed." });
        }
      }
    } catch (error) {
      // A broken IP check must not silently disable auth entirely — but it
      // also must not be allowed to lock everyone out if, say, Mongo has a
      // blip. Log it and fall through to the normal auth check below.
      console.error("IP restriction check failed:", error.message);
    }
  }

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
