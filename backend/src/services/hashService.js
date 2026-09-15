const crypto = require("crypto");

function generateDocumentHash(fileBuffer) {
  return "0x" + crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

function hashToBytes32(hexHash) {
  return hexHash.startsWith("0x") ? hexHash : "0x" + hexHash;
}

module.exports = { generateDocumentHash, hashToBytes32 };
