const jwt = require("jsonwebtoken");

/**
 * Bearer-JWT auth for policyholders (email + password / Supabase Auth).
 * Policyholders have no wallet in the hybrid signing model, so they can't
 * use the x-wallet-address header rbacMiddleware relies on for staff.
 * The JWT is minted at login (see authController.loginPolicyholder) and
 * carries {userId, role: 'policyholder', holderId, name} directly, so no
 * DB lookup is needed per request.
 */
function policyholderAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "policyholder") {
      return res.status(403).json({ error: "Policyholder account required" });
    }
    req.user = decoded; // { userId, role, holderId, name }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = policyholderAuth;
