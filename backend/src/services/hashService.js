const crypto = require("crypto");
const { ethers } = require("ethers");

function generateDocumentHash(fileBuffer) {
  return "0x" + crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

function hashToBytes32(hexHash) {
  return hexHash.startsWith("0x") ? hexHash : "0x" + hexHash;
}

// JSON with object keys sorted at every level. The claim form details are
// kept in Postgres JSONB, which does not preserve key order, so the hash
// recorded on-chain at submission and the hash recomputed later for the
// integrity check must both be taken over this canonical form.
function canonicalJson(value) {
  if (value === undefined || value === null) return "null";
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (typeof value === "object") {
    return "{" + Object.keys(value).sort().map((k) => JSON.stringify(k) + ":" + canonicalJson(value[k])).join(",") + "}";
  }
  return JSON.stringify(value);
}

function hashDetails(details) {
  return ethers.keccak256(ethers.toUtf8Bytes(canonicalJson(details ?? {})));
}

function hashText(text) {
  return ethers.keccak256(ethers.toUtf8Bytes(text));
}

module.exports = { generateDocumentHash, hashToBytes32, canonicalJson, hashDetails, hashText };
