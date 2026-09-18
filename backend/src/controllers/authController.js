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

  if (user.is_active === false)
    return res.status(403).json({ error: "This account has been deactivated" });

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

async function getUsers(req, res) {
  const { data: users, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ users });
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { role, isActive } = req.body;

  const updates = {};
  if (role !== undefined) {
    const validRoles = ["policyholder", "verifier", "admin", "auditor"];
    if (!validRoles.includes(role))
      return res.status(400).json({ error: "Invalid role" });
    updates.role = role;
  }
  if (isActive !== undefined) updates.is_active = isActive;

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ user: data });
}

module.exports = { login, register, getUsers, updateUser };
