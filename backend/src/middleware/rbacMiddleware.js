const supabase = require("../services/supabaseService");

function rbac(...allowedRoles) {
  return async (req, res, next) => {
    const wallet = req.headers["x-wallet-address"]?.toLowerCase();
    if (!wallet)
      return res.status(401).json({ error: "No wallet address provided" });

    const { data, error } = await supabase
      .from("users")
      .select("id, role, full_name")
      .eq("wallet_address", wallet)
      .single();

    if (error || !data)
      return res.status(401).json({ error: "User not found" });
    if (!allowedRoles.includes(data.role))
      return res.status(403).json({ error: "Insufficient permissions" });

    req.user = { wallet, role: data.role, id: data.id, name: data.full_name };
    next();
  };
}

module.exports = rbac;
