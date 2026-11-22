const db = require("../services/db");

function rbac(...allowedRoles) {
  return async (req, res, next) => {
    const wallet = req.headers["x-wallet-address"]?.toLowerCase();
    if (!wallet)
      return res.status(401).json({ error: "No wallet address provided" });

    const data = await db.one("SELECT id, role, full_name, is_active FROM users WHERE wallet_address = $1", [wallet]);

    if (!data || data.is_active === false)
      return res.status(401).json({ error: "User not found" });
    if (!allowedRoles.includes(data.role))
      return res.status(403).json({ error: "Insufficient permissions" });

    req.user = { wallet, role: data.role, id: data.id, name: data.full_name };
    next();
  };
}

module.exports = rbac;
