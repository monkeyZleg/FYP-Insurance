// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./PolicyRegistry.sol";

/// @title ClaimRegistry
/// @notice Stores claims, documents, duplicate checks and verifier
///         decisions for the BEICVS hybrid signing model (Option B).
///         Answers "what happened to this claim?".
contract ClaimRegistry is AccessControl, Pausable {
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    uint256 public constant MAX_DOC_HASHES = 10;

    PolicyRegistry public immutable policyRegistry;

    enum ClaimStatus { Submitted, UnderReview, Approved, Rejected, Settled }

    struct Claim {
        bytes32 holderId;
        uint256 policyId;
        PolicyRegistry.PolicyType claimType;
        uint64 incidentDate;
        uint64 submittedAt;
        bytes32 detailsHash;        // hash of the off-chain claim form
        bytes32[] docHashes;        // hashes of uploaded documents (max 10)
        address assignedVerifier;
        address decidedBy;
        uint64 decidedAt;
        bytes32 remarkHash;         // hash of the verifier's off-chain remark
        uint8 reasonCode;           // rejection reason
        bool flagged;               // audit flag
        ClaimStatus status;
    }

    uint256 public claimCount;
    mapping(uint256 => Claim) private claims;
    mapping(bytes32 => uint256) public claimByDoc;
    mapping(bytes32 => uint256) public claimByKey;

    error EmptyDocHashes();
    error TooManyDocHashes();
    error EmptyHash();
    error DuplicateDocument(bytes32 docHash, uint256 existingClaimId);
    error DuplicateClaimKey(bytes32 claimKey, uint256 existingClaimId);
    error NotEligible(PolicyRegistry.Reason reason);
    error ClaimNotFound();
    error NotAssignedVerifier();
    error InvalidVerifier();
    error InvalidStatus();

    event ClaimSubmitted(
        uint256 indexed claimId,
        uint256 indexed policyId,
        bytes32 indexed holderId,
        bytes32[] docHashes,
        bytes32 detailsHash
    );

    event VerifierAssigned(uint256 indexed claimId, address indexed verifier);

    event ClaimDecided(
        uint256 indexed claimId,
        bool approve,
        address indexed verifier,
        uint8 reasonCode,
        bytes32 remarkHash
    );

    event ClaimSettled(uint256 indexed claimId, bytes32 payoutRefHash);

    event ClaimFlagged(uint256 indexed claimId, address indexed auditor, bytes32 findingHash);

    event DocumentReused(bytes32 indexed docHash, uint256 oldClaimId, uint256 newClaimId);

    constructor(address policyRegistryAddress) {
        policyRegistry = PolicyRegistry(policyRegistryAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ---------------------------------------------------------------
    // Pause control (Section 8: emergency stop)
    // ---------------------------------------------------------------

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // ---------------------------------------------------------------
    // Relayer: submit claim
    // ---------------------------------------------------------------

    function submitClaim(
        bytes32 holderId,
        uint256 policyId,
        PolicyRegistry.PolicyType claimType,
        uint64 incidentDate,
        bytes32[] calldata docHashes,
        bytes32 detailsHash
    ) external onlyRole(RELAYER_ROLE) whenNotPaused returns (uint256 claimId) {
        if (docHashes.length == 0) revert EmptyDocHashes();
        if (docHashes.length > MAX_DOC_HASHES) revert TooManyDocHashes();

        (bool ok, PolicyRegistry.Reason reason) =
            policyRegistry.isEligible(policyId, holderId, claimType, incidentDate);
        if (!ok) revert NotEligible(reason);

        bytes32 claimKey = keccak256(abi.encode(policyId, claimType, incidentDate));
        uint256 existingKeyClaim = claimByKey[claimKey];
        if (existingKeyClaim != 0 && claims[existingKeyClaim].status != ClaimStatus.Rejected) {
            revert DuplicateClaimKey(claimKey, existingKeyClaim);
        }

        claimId = ++claimCount;
        Claim storage c = claims[claimId];
        c.holderId = holderId;
        c.policyId = policyId;
        c.claimType = claimType;
        c.incidentDate = incidentDate;
        c.submittedAt = uint64(block.timestamp);
        c.detailsHash = detailsHash;
        c.status = ClaimStatus.Submitted;

        for (uint256 i = 0; i < docHashes.length; i++) {
            bytes32 h = docHashes[i];
            if (h == bytes32(0)) revert EmptyHash();
            uint256 existing = claimByDoc[h];
            if (existing != 0) {
                Claim storage old = claims[existing];
                bool reusable = old.status == ClaimStatus.Rejected && old.holderId == holderId;
                if (!reusable) revert DuplicateDocument(h, existing);
                emit DocumentReused(h, existing, claimId);
            }
            claimByDoc[h] = claimId;
            c.docHashes.push(h);
        }

        claimByKey[claimKey] = claimId;

        emit ClaimSubmitted(claimId, policyId, holderId, docHashes, detailsHash);
    }

    // ---------------------------------------------------------------
    // Admin: assign / settle
    // ---------------------------------------------------------------

    function assignVerifier(uint256 claimId, address verifier)
        external
        onlyRole(ADMIN_ROLE)
        whenNotPaused
    {
        Claim storage c = claims[claimId];
        if (c.holderId == bytes32(0)) revert ClaimNotFound();
        if (c.status != ClaimStatus.Submitted) revert InvalidStatus();
        if (!hasRole(VERIFIER_ROLE, verifier)) revert InvalidVerifier();

        c.assignedVerifier = verifier;
        c.status = ClaimStatus.UnderReview;

        emit VerifierAssigned(claimId, verifier);
    }

    function settleClaim(uint256 claimId, bytes32 payoutRefHash)
        external
        onlyRole(ADMIN_ROLE)
        whenNotPaused
    {
        Claim storage c = claims[claimId];
        if (c.holderId == bytes32(0)) revert ClaimNotFound();
        if (c.status != ClaimStatus.Approved) revert InvalidStatus();

        c.status = ClaimStatus.Settled;

        emit ClaimSettled(claimId, payoutRefHash);
    }

    // ---------------------------------------------------------------
    // Assigned verifier: decide
    // ---------------------------------------------------------------

    function decideClaim(
        uint256 claimId,
        bool approve,
        uint8 reasonCode,
        bytes32 remarkHash
    ) external whenNotPaused {
        Claim storage c = claims[claimId];
        if (c.holderId == bytes32(0)) revert ClaimNotFound();
        if (c.status != ClaimStatus.UnderReview) revert InvalidStatus();
        if (msg.sender != c.assignedVerifier) revert NotAssignedVerifier();

        c.decidedBy = msg.sender;
        c.decidedAt = uint64(block.timestamp);
        c.remarkHash = remarkHash;
        c.reasonCode = reasonCode;
        c.status = approve ? ClaimStatus.Approved : ClaimStatus.Rejected;

        emit ClaimDecided(claimId, approve, msg.sender, reasonCode, remarkHash);
    }

    // ---------------------------------------------------------------
    // Auditor: flag
    // ---------------------------------------------------------------

    function flagClaim(uint256 claimId, bytes32 findingHash) external onlyRole(AUDITOR_ROLE) {
        Claim storage c = claims[claimId];
        if (c.holderId == bytes32(0)) revert ClaimNotFound();

        c.flagged = true;

        emit ClaimFlagged(claimId, msg.sender, findingHash);
    }

    // ---------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------

    function verifyDocument(uint256 claimId, bytes32 docHash) external view returns (bool) {
        return claimByDoc[docHash] == claimId && claimId != 0;
    }

    function getClaim(uint256 claimId) external view returns (Claim memory) {
        return claims[claimId];
    }
}
