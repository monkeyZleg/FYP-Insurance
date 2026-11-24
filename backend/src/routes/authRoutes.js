const express = require("express");
const router = express.Router();
const {
  login,
  register,
  registerPolicyholder,
  getUsers,
  updateUser,
} = require("../controllers/authController");
const rbac = require("../middleware/rbacMiddleware");

// Every role signs in with email + password + the role they're signing in as.
router.post("/login", login);
// Admin creates staff accounts; policyholders register themselves.
router.post("/register", rbac("admin"), register);
router.post("/policyholder/register", registerPolicyholder);

router.get("/users", rbac("admin"), getUsers);
router.patch("/users/:id", rbac("admin"), updateUser);

module.exports = router;
