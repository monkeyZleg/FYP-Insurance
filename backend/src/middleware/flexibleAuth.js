const jwt = require("jsonwebtoken");
const rbac = require("./rbacMiddleware");

/**
 * For routes both policyholders and staff read, such as GET /api/claims/:id.
 * Everyone sends the Bearer JWT from login. A policyholder token carries
 * everything needed (holderId); a staff token is checked against the
 * database like rbac does. Sets req.user the same shape either way:
 * { id, role, holderId?, wallet?, name }.
 */
function flexibleAuth(...allowedRoles) {
  const staff = rbac(...allowedRoles);
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "No credentials provided" });

    let decoded;
    try {
      decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (decoded.role !== "policyholder") return staff(req, res, next);

    if (allowedRoles.length && !allowedRoles.includes("policyholder"))
      return res.status(403).json({ error: "Insufficient permissions" });
    req.user = { id: decoded.userId, role: decoded.role, holderId: decoded.holderId, name: decoded.name };
    next();
  };
}

module.exports = flexibleAuth;
