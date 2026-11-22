const crypto = require("crypto");
const { promisify } = require("util");
const db = require("../services/db");
const jwt = require("jsonwebtoken");
const { deriveHolderId } = require("../services/holderIdService");

const STAFF_ROLES = ["verifier", "admin", "auditor"];
const scrypt = promisify(crypto.scrypt);

/** Policyholder passwords are stored as "salt:hash" (scrypt, built into Node). */
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${(await scrypt(password, salt, 64)).toString("hex")}`;
}

async function checkPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const actual = await scrypt(password, salt, 64);
  return crypto.timingSafeEqual(actual, Buffer.from(hash, "hex"));
}

/* ---- Staff (MetaMask wallet) login/register — unchanged model ---- */

async function login(req, res) {
  const { walletAddress } = req.body;
  if (!walletAddress)
    return res.status(400).json({ error: "Wallet address required" });

  const user = await db.one("SELECT * FROM users WHERE wallet_address = $1", [walletAddress.toLowerCase()]);

  if (!user)
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

  try {
    const data = await db.one(
      `INSERT INTO users (wallet_address, full_name, email, role) VALUES ($1, $2, $3, $4)
       RETURNING id, wallet_address, full_name, email, role, is_active, created_at`,
      [walletAddress.toLowerCase(), fullName, email, role]
    );
    res.status(201).json({ user: data });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to register user" });
  }
}

/* ---- Policyholder (email + password) — hybrid signing model ---- */

const PROFILE_COLUMNS = "id, holder_id, full_name, email, role, is_active, created_at";

async function registerPolicyholder(req, res) {
  const { email, password, fullName } = req.body;
  if (!email || !password || !fullName)
    return res.status(400).json({ error: "email, password and fullName are required" });
  if (password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters" });

  // The account id is made here so the holderId can be derived from it in the same insert.
  const id = crypto.randomUUID();
  try {
    const profile = await db.one(
      `INSERT INTO users (id, holder_id, password_hash, full_name, email, role)
       VALUES ($1, $2, $3, $4, $5, 'policyholder') RETURNING ${PROFILE_COLUMNS}`,
      [id, deriveHolderId(id), await hashPassword(password), fullName, email.toLowerCase()]
    );
    res.status(201).json({ user: profile });
  } catch (err) {
    if (err.code === "23505") return res.status(400).json({ error: "An account with this email already exists" });
    res.status(400).json({ error: err.message || "Failed to create account" });
  }
}

async function loginPolicyholder(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "email and password are required" });

  const profile = await db.one("SELECT * FROM users WHERE email = $1 AND role = 'policyholder'", [email.toLowerCase()]);
  if (!profile || !(await checkPassword(password, profile.password_hash)))
    return res.status(401).json({ error: "Invalid email or password" });

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
  try {
    const users = await db.query(
      "SELECT id, wallet_address, holder_id, full_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC"
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { role, isActive } = req.body;

  const updates = {};
  if (role !== undefined) {
    const validRoles = ["policyholder", "verifier", "admin", "auditor"];
    if (!validRoles.includes(role))
      return res.status(400).json({ error: "Invalid role" });

    const existing = await db.one("SELECT role FROM users WHERE id = $1", [id]);
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

  try {
    const data = await db.one(
      `UPDATE users SET role = COALESCE($2, role), is_active = COALESCE($3, is_active) WHERE id = $1
       RETURNING id, wallet_address, holder_id, full_name, email, role, is_active, created_at`,
      [id, updates.role ?? null, updates.is_active ?? null]
    );
    if (!data) return res.status(404).json({ error: "User not found" });
    res.json({ user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  login,
  register,
  registerPolicyholder,
  loginPolicyholder,
  getUsers,
  updateUser,
};
