const express = require("express");
const router = express.Router();
const { login, register } = require("../controllers/authController");
const rbac = require("../middleware/rbacMiddleware");

router.post("/login", login);
router.post("/register", rbac("admin"), register);

module.exports = router;
