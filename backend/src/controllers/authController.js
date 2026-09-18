const supabase = require("../services/supabaseService");
const jwt = require("jsonwebtoken");
const { deriveHolderId } = require("../services/holderIdService");

const STAFF_ROLES = ["verifier", "admin", "auditor"];

/* ---- Staff (MetaMask wallet) login/register — unchanged model ---- */

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

  if (user.role === "policyholder")
    return res.status(400).json({ error: "Policyholders log in with email and password, not a wallet" });

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

  if (!STAFF_ROLES.includes(role))
    return res
      .status(400)
      .json({ error: "This endpoint registers staff only (verifier, admin, auditor) — policyholders self-register with email and password" });

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

/* ---- Policyholder (email + password, Supabase Auth) — hybrid signing model ---- */

async function registerPolicyholder(req, res) {
  const { email, password, fullName } = req.body;
  if (!email || !password || !fullName)
    return res.status(400).json({ error: "email, password and fullName are required" });
  if (password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters" });

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError)
    return res.status(400).json({ error: authError.message || "Failed to create account" });

  const authUserId = authData.user.id;
  const holderId = deriveHolderId(authUserId);

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .insert({
      auth_user_id: authUserId,
      holder_id: holderId,
      full_name: fullName,
      email,
      role: "policyholder",
    })
    .select()
    .single();

  if (profileError) {
    // Roll back the auth user so a failed registration doesn't leave an orphaned login.
    await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
    return res.status(400).json({ error: profileError.message || "Failed to create profile" });
  }

  res.status(201).json({ user: profile });
}

async function loginPolicyholder(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "email and password are required" });

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError || !authData?.user)
    return res.status(401).json({ error: "Invalid email or password" });

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", authData.user.id)
    .single();

  if (profileError || !profile)
    return res.status(404).json({ error: "No policyholder profile found for this account" });

  if (profile.is_active === false)
    return res.status(403).json({ error: "This account has been deactivated" });

  const token = jwt.sign(
    { userId: profile.id, role: "policyholder", holderId: profile.holder_id, name: profile.full_name },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({ token, role: "policyholder", name: profile.full_name, userId: profile.id, holderId: profile.holder_id });
}

/* ---- Admin: user management (both staff and policyholders) ---- */

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

    const { data: existing } = await supabase.from("users").select("role").eq("id", id).single();
    const crossesBoundary =
      existing && ((existing.role === "policyholder") !== (role === "policyholder"));
    if (crossesBoundary)
      return res.status(400).json({
        error:
          "Cannot change role across the policyholder/staff boundary — policyholders use email+password identity, staff use a wallet address. Create a new account instead.",
      });
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

module.exports = {
  login,
  register,
  registerPolicyholder,
  loginPolicyholder,
  getUsers,
  updateUser,
};
