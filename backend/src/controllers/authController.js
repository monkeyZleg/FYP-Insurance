const supabase = require("../services/supabaseService");
const jwt = require("jsonwebtoken");

async function login(req, res) {
  const { walletAddress } = req.body;
  if (!walletAddress)
    return res.status(400).json({ error: "Wallet address required" });

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("wallet_address", walletAddress.toLowerCase())
    .single();

  if (error || !user)
    return res
      .status(404)
      .json({ error: "Wallet not registered in the system" });

  const token = jwt.sign(
    { wallet: walletAddress, role: user.role, userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({ token, role: user.role, name: user.full_name, userId: user.id });
}

async function register(req, res) {
  const { walletAddress, fullName, email, role } = req.body;

  if (!walletAddress || !role)
    return res
      .status(400)
      .json({ error: "walletAddress and role are required" });

  const validRoles = ["policyholder", "verifier", "admin", "auditor"];
  if (!validRoles.includes(role))
    return res.status(400).json({ error: "Invalid role" });

  const { data, error } = await supabase
    .from("users")
    .insert({
      wallet_address: walletAddress.toLowerCase(),
      full_name: fullName,
      email,
      role,
    })
    .select()
    .single();

  if (error)
    return res
      .status(400)
      .json({ error: error.message || "Failed to register user" });

  res.status(201).json({ user: data });
}

module.exports = { login, register };
