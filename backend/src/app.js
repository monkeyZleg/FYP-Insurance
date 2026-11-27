const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const claimRoutes = require("./routes/claimRoutes");
const documentRoutes = require("./routes/documentRoutes");
const blockchainRoutes = require("./routes/blockchainRoutes");
const policyRoutes = require("./routes/policyRoutes");
const ekycRoutes = require("./routes/ekycRoutes");

const app = express();
app.use(cors());
app.use(express.json());
// Express 5 leaves req.body undefined when a request has no body; the handlers expect {}.
app.use((req, res, next) => {
  req.body ??= {};
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/blockchain", blockchainRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/ekyc", ekycRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Express 5 sends errors thrown in async handlers here instead of leaving the request hanging.
app.use((err, req, res, next) => {
  if (err.code === "22P02") return res.status(400).json({ error: "Invalid id" }); // malformed UUID in the URL
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
