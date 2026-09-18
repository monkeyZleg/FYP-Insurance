const jwt = require("jsonwebtoken");
const supabase = require("../services/supabaseService");

/**
 * Accepts either a policyholder Bearer JWT (email/password login) or a
 * staff x-wallet-address header (MetaMask login) — used on routes both
 * sides need to read, such as GET /api/claims/:id. Sets req.user the
 * same shape either way: { id, role, holderId? , wallet? , name }.
 */
function flexibleAuth(...allowedRoles) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
        if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        req.user = { id: decoded.userId, role: decoded.role, holderId: decoded.holderId, name: decoded.name };
        return next();
      } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
    }

    const wallet = req.headers["x-wallet-address"]?.toLowerCase();
    if (!wallet) return res.status(401).json({ error: "No credentials provided" });

    const { data, error } = await supabase
      .from("users")
      .select("id, role, full_name")
      .eq("wallet_address", wallet)
      .single();

    if (error || !data) return res.status(401).json({ error: "User not found" });
    if (allowedRoles.length && !allowedRoles.includes(data.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    req.user = { id: data.id, role: data.role, wallet, name: data.full_name };
    next();
  };
}

module.exports = flexibleAuth;
