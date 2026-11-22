const { ethers } = require("ethers");

/**
 * holderId = keccak256(abi.encodePacked(userUuid, serverSecretSalt))
 * per smart-contract-spec-hybrid.md Section 1. The policyholder's account
 * id (users.id, a random UUID) is used as userUuid, so nothing extra needs
 * to be generated or stored. Never hash an IC number
 * or email: those are guessable and reversible by brute force.
 */
function deriveHolderId(userUuid) {
  const salt = process.env.HOLDER_ID_SALT;
  if (!salt) throw new Error("HOLDER_ID_SALT is not configured");
  return ethers.solidityPackedKeccak256(["string", "string"], [userUuid, salt]);
}

module.exports = { deriveHolderId };
