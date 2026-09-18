const express = require("express");
const router = express.Router();
const {
  login,
  register,
  registerPolicyholder,
  loginPolicyholder,
  getUsers,
  updateUser,
} = require("../controllers/authController");
const rbac = require("../middleware/rbacMiddleware");

// Staff (MetaMask wallet)
router.post("/login", login);
router.post("/register", rbac("admin"), register);

// Policyholder (email + password, Supabase Auth — hybrid signing model)
router.post("/policyholder/register", registerPolicyholder);
router.post("/policyholder/login", loginPolicyholder);

router.get("/users", rbac("admin"), getUsers);
router.patch("/users/:id", rbac("admin"), updateUser);

module.exports = router;
