// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./PolicyRegistry.sol";

/// @title ClaimRegistry
/// @notice Stores claims, documents, duplicate checks, verifier decisions
///         and settlement amounts for the BEICVS hybrid signing model
///         (Option B). Answers "what happened to this claim?".
/// @dev All money amounts are sample values in sen (RM x 100). No real
///      funds move through this contract - payouts are simulated and only
///      the figures are recorded for the audit trail.
contract ClaimRegistry is AccessControl, Pausable {
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    uint256 public constant MAX_DOC_HASHES = 10;
    uint16 public constant MAX_RATE_BPS = 10000; // 100%

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
        uint256 claimedAmount;      // amount claimed, in sen (0 = not stated)
        uint256 approvedPayout;     // insurer payout approved by the verifier, in sen
        uint256 serviceCharge;      // platform fee fixed at settlement, in sen
        uint256 netPayout;          // amount the policyholder receives, in sen
    }

    /// @notice Platform service charge applied when an approved claim is
    ///         settled. Mirrors the out-of-pocket calculator on the claim
    ///         request page (frontend/constants/claimCalculator.ts).
    struct ServiceCharge {
        bool flat;                  // true = flat fee, false = percentage
        uint16 rateBps;             // percentage model: 200 = 2%
        uint256 flatFee;            // flat model: fee per approved claim, in sen
        uint256 minFee;             // percentage model: minimum fee, in sen
        uint256 maxFee;             // percentage model: cap, in sen (0 = no cap)
        bool policyholderPays;      // true = deducted from the payout
    }

    ServiceCharge public serviceCharge;

    /// @notice Running total of service charges on settled claims, in sen.
    uint256 public totalServiceCharges;

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
    error InvalidPayout();
    error PayoutExceedsClaim(uint256 approvedPayout, uint256 claimedAmount);
    error InvalidServiceCharge();

    event ClaimSubmitted(
        uint256 indexed claimId,
        uint256 indexed policyId,
        bytes32 indexed holderId,
        bytes32[] docHashes,
        bytes32 detailsHash,
        uint256 claimedAmount
    );

    event VerifierAssigned(uint256 indexed claimId, address indexed verifier);

    event ClaimDecided(
        uint256 indexed claimId,
        bool approve,
        address indexed verifier,
        uint8 reasonCode,
        bytes32 remarkHash,
        uint256 approvedPayout
    );

    event ClaimSettled(
        uint256 indexed claimId,
        bytes32 payoutRefHash,
        uint256 approvedPayout,
        uint256 serviceCharge,
        uint256 netPayout
    );

    event ClaimFlagged(uint256 indexed claimId, address indexed auditor, bytes32 findingHash);

    event DocumentReused(bytes32 indexed docHash, uint256 oldClaimId, uint256 newClaimId);

    event ServiceChargeUpdated(
        bool flat,
        uint16 rateBps,
        uint256 flatFee,
        uint256 minFee,
        uint256 maxFee,
        bool policyholderPays,
        address indexed updatedBy
    );

    constructor(address policyRegistryAddress) {
        policyRegistry = PolicyRegistry(policyRegistryAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // Default: 2% of the approved payout, minimum RM 10, maximum RM 200,
        // deducted from the policyholder's payout (flat alternative RM 20).
        serviceCharge = ServiceCharge({
            flat: false,
            rateBps: 200,
            flatFee: 2000,
            minFee: 1000,
            maxFee: 20000,
            policyholderPays: true
        });
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
    // Admin: service charge settings
    // ---------------------------------------------------------------

    /// @notice Change the service charge. Applies to claims settled after
    ///         this call; already settled claims keep the figures stored
    ///         with them.
    function setServiceCharge(
        bool flat,
        uint16 rateBps,
        uint256 flatFee,
        uint256 minFee,
        uint256 maxFee,
        bool policyholderPays
    ) external onlyRole(ADMIN_ROLE) {
        if (rateBps > MAX_RATE_BPS) revert InvalidServiceCharge();
        if (maxFee != 0 && minFee > maxFee) revert InvalidServiceCharge();

        serviceCharge = ServiceCharge(flat, rateBps, flatFee, minFee, maxFee, policyholderPays);

        emit ServiceChargeUpdated(flat, rateBps, flatFee, minFee, maxFee, policyholderPays, msg.sender);
    }

    /// @notice Service charge and net payout for a given approved payout
    ///         under the current settings. The charge never exceeds the
    ///         payout, and a zero payout carries no charge.
    function quoteServiceCharge(uint256 payout) public view returns (uint256 charge, uint256 net) {
        if (payout == 0) return (0, 0);

        ServiceCharge memory s = serviceCharge;
        if (s.flat) {
            charge = s.flatFee;
        } else {
            charge = (payout * s.rateBps + 5000) / 10000; // rounded to the nearest sen
            if (charge < s.minFee) charge = s.minFee;
            if (s.maxFee != 0 && charge > s.maxFee) charge = s.maxFee;
        }
        if (charge > payout) charge = payout;

        net = s.policyholderPays ? payout - charge : payout;
    }

    // ---------------------------------------------------------------
    // Relayer: submit claim
    // ---------------------------------------------------------------

    /// @param claimedAmount Amount claimed in sen; 0 when the form does not
    ///        state one. When set, the approved payout can never exceed it.
    function submitClaim(
        bytes32 holderId,
        uint256 policyId,
        PolicyRegistry.PolicyType claimType,
        uint64 incidentDate,
        bytes32[] calldata docHashes,
        bytes32 detailsHash,
        uint256 claimedAmount
    ) external onlyRole(RELAYER_ROLE) whenNotPaused returns (uint256 claimId) {
        if (docHashes.length == 0) revert EmptyDocHashes();
        if (docHashes.length > MAX_DOC_HASHES) revert TooManyDocHashes();

        (bool ok, PolicyRegistry.Reason reason) =
            policyRegistry.isEligible(policyId, holderId, claimType, incidentDate);
        if (!ok) revert NotEligible(reason);

        bytes32 claimKey = keccak256(abi.encode(policyId, claimType, incidentDate));
        {
            uint256 existingKeyClaim = claimByKey[claimKey];
            if (existingKeyClaim != 0 && claims[existingKeyClaim].status != ClaimStatus.Rejected) {
                revert DuplicateClaimKey(claimKey, existingKeyClaim);
            }
        }

        claimId = ++claimCount;
        Claim storage c = claims[claimId];
        c.holderId = holderId;
        c.policyId = policyId;
        c.claimType = claimType;
        c.incidentDate = incidentDate;
        c.submittedAt = uint64(block.timestamp);
        c.detailsHash = detailsHash;
        c.claimedAmount = claimedAmount;
        c.status = ClaimStatus.Submitted;

        _registerDocuments(claimId, holderId, docHashes);

        claimByKey[claimKey] = claimId;

        emit ClaimSubmitted(claimId, policyId, holderId, docHashes, detailsHash, claimedAmount);
    }

    /// @dev Duplicate-document check: a hash already used by another claim
    ///      is refused unless that claim was rejected and belongs to the
    ///      same holder (a corrected resubmission).
    function _registerDocuments(
        uint256 claimId,
        bytes32 holderId,
        bytes32[] calldata docHashes
    ) private {
        Claim storage c = claims[claimId];
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

    /// @notice Settle an approved claim. The service charge is computed
    ///         here from the current settings and stored with the claim,
    ///         so the payout, the fee and the net amount are all part of
    ///         the permanent audit trail.
    function settleClaim(uint256 claimId, bytes32 payoutRefHash)
        external
        onlyRole(ADMIN_ROLE)
        whenNotPaused
    {
        Claim storage c = claims[claimId];
        if (c.holderId == bytes32(0)) revert ClaimNotFound();
        if (c.status != ClaimStatus.Approved) revert InvalidStatus();

        (uint256 charge, uint256 net) = quoteServiceCharge(c.approvedPayout);
        c.serviceCharge = charge;
        c.netPayout = net;
        c.status = ClaimStatus.Settled;
        totalServiceCharges += charge;

        emit ClaimSettled(claimId, payoutRefHash, c.approvedPayout, charge, net);
    }

    // ---------------------------------------------------------------
    // Assigned verifier: decide
    // ---------------------------------------------------------------

    /// @param approvedPayout Insurer payout in sen. Must be greater than 0
    ///        when approving and 0 when rejecting.
    function decideClaim(
        uint256 claimId,
        bool approve,
        uint8 reasonCode,
        bytes32 remarkHash,
        uint256 approvedPayout
    ) external whenNotPaused {
        Claim storage c = claims[claimId];
        if (c.holderId == bytes32(0)) revert ClaimNotFound();
        if (c.status != ClaimStatus.UnderReview) revert InvalidStatus();
        if (msg.sender != c.assignedVerifier) revert NotAssignedVerifier();

        if (approve) {
            if (approvedPayout == 0) revert InvalidPayout();
            if (c.claimedAmount != 0 && approvedPayout > c.claimedAmount) {
                revert PayoutExceedsClaim(approvedPayout, c.claimedAmount);
            }
        } else if (approvedPayout != 0) {
            revert InvalidPayout();
        }

        c.decidedBy = msg.sender;
        c.decidedAt = uint64(block.timestamp);
        c.remarkHash = remarkHash;
        c.reasonCode = reasonCode;
        c.approvedPayout = approvedPayout;
        c.status = approve ? ClaimStatus.Approved : ClaimStatus.Rejected;

        emit ClaimDecided(claimId, approve, msg.sender, reasonCode, remarkHash, approvedPayout);
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
