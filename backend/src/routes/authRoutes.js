const express = require("express");
const router = express.Router();
const { login, register, getUsers, updateUser } = require("../controllers/authController");
const rbac = require("../middleware/rbacMiddleware");

router.post("/login", login);
router.post("/register", rbac("admin"), register);
router.get("/users", rbac("admin"), getUsers);
router.patch("/users/:id", rbac("admin"), updateUser);

module.exports = router;
