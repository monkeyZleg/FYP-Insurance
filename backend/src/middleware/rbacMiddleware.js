const jwt = require("jsonwebtoken");
const db = require("../services/db");

/**
 * Staff auth: the Bearer JWT from the email + password login. The account is
 * re-read on every request, so deactivating someone or changing their role
 * takes effect immediately. req.user.wallet is the account's registered
 * wallet — the address that signs its on-chain actions.
 */
function rbac(...allowedRoles) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res.status(401).json({ error: "No token provided" });

    let decoded;
    try {
      decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const data = await db.one("SELECT id, role, full_name, wallet_address, is_active FROM users WHERE id = $1", [decoded.userId]);

    if (!data || data.is_active === false)
      return res.status(401).json({ error: "User not found" });
    if (!allowedRoles.includes(data.role))
      return res.status(403).json({ error: "Insufficient permissions" });

    req.user = { id: data.id, role: data.role, name: data.full_name, wallet: data.wallet_address?.toLowerCase() };
    next();
  };
}

module.exports = rbac;
