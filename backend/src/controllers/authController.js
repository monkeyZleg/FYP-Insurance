const crypto = require("crypto");
const { promisify } = require("util");
const db = require("../services/db");
const jwt = require("jsonwebtoken");
const { deriveHolderId } = require("../services/holderIdService");

const STAFF_ROLES = ["verifier", "admin", "auditor"];
const scrypt = promisify(crypto.scrypt);

/** Passwords (every role) are stored as "salt:hash" (scrypt, built into Node). */
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

/* ---- Login: every role signs in with email + password ---- */

const ROLES = ["policyholder", ...STAFF_ROLES];
const ROLE_LABEL = { policyholder: "Policyholder", verifier: "Verifier", admin: "Admin", auditor: "Auditor" };

/**
 * POST /api/auth/login  { email, password, role }
 * The login page asks which role you're signing in as; the account must
 * hold that role. Staff still keep a wallet_address: it isn't used to sign
 * in any more, only to sign their on-chain actions with MetaMask.
 */
async function login(req, res) {
  const { email, password, role } = req.body;
  if (!email || !password || !role)
    return res.status(400).json({ error: "email, password and role are required" });
  if (!ROLES.includes(role))
    return res.status(400).json({ error: "Invalid role" });

  const user = await db.one("SELECT * FROM users WHERE email = $1", [String(email).toLowerCase()]);
  if (!user || !(await checkPassword(password, user.password_hash)))
    return res.status(401).json({ error: "Invalid email or password" });

  // The password was right, so naming the account's actual role leaks nothing.
  if (user.role !== role)
    return res.status(403).json({
      error: `This is a${user.role === "admin" || user.role === "auditor" ? "n" : ""} ${ROLE_LABEL[user.role]} account. Choose ${ROLE_LABEL[user.role]} to sign in.`,
    });

  if (user.is_active === false)
    return res.status(403).json({ error: "This account has been deactivated" });

  const claims = { userId: user.id, role: user.role, name: user.full_name };
  if (user.role === "policyholder") claims.holderId = user.holder_id;
  const token = jwt.sign(claims, process.env.JWT_SECRET, { expiresIn: "8h" });

  res.json({
    token,
    role: user.role,
    name: user.full_name,
    userId: user.id,
    holderId: user.holder_id || undefined,
    walletAddress: user.wallet_address || undefined,
  });
}

/* ---- Admin: create a staff account (email + password, plus the wallet that signs on-chain) ---- */

async function register(req, res) {
  const { walletAddress, fullName, email, password, role } = req.body;

  if (!email || !password || !role || !walletAddress)
    return res.status(400).json({ error: "email, password, role and walletAddress are required" });

  if (!STAFF_ROLES.includes(role))
    return res
      .status(400)
      .json({ error: "This endpoint creates staff only (verifier, admin, auditor) — policyholders register themselves" });

  try {
    const data = await db.one(
      `INSERT INTO users (wallet_address, password_hash, full_name, email, role) VALUES ($1, $2, $3, $4, $5)
       RETURNING id, wallet_address, full_name, email, role, is_active, created_at`,
      [walletAddress.toLowerCase(), await hashPassword(password), fullName, String(email).toLowerCase(), role]
    );
    res.status(201).json({ user: data });
  } catch (err) {
    if (err.code === "23505") return res.status(400).json({ error: "An account with this email or wallet already exists" });
    res.status(400).json({ error: err.message || "Failed to register user" });
  }
}

/* ---- Policyholder self-registration ---- */

const PROFILE_COLUMNS = "id, holder_id, full_name, email, role, is_active, created_at";

async function registerPolicyholder(req, res) {
  const { email, password, fullName } = req.body;
  if (!email || !password || !fullName)
    return res.status(400).json({ error: "email, password and fullName are required" });

  // The account id is made here so the holderId can be derived from it in the same insert.
  const id = crypto.randomUUID();
  try {
    const profile = await db.one(
      `INSERT INTO users (id, holder_id, password_hash, full_name, email, role)
       VALUES ($1, $2, $3, $4, $5, 'policyholder') RETURNING ${PROFILE_COLUMNS}`,
      [id, deriveHolderId(id), await hashPassword(password), fullName, String(email).toLowerCase()]
    );
    res.status(201).json({ user: profile });
  } catch (err) {
    if (err.code === "23505") return res.status(400).json({ error: "An account with this email already exists" });
    res.status(400).json({ error: err.message || "Failed to create account" });
  }
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
          "Cannot change role across the policyholder/staff boundary — policyholders are identified on-chain by a holder ID, staff by their wallet. Create a new account instead.",
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
  getUsers,
  updateUser,
};
