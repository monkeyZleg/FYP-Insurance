// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PolicyRegistry
/// @notice Stores insurance policies, payments and renewals for the BEICVS
///         hybrid signing model (Option B). Answers "is this policy valid?".
/// @dev Policy status is never stored as a field - it is computed on read
///      from timestamps (see effectiveStatus / Section 4.3 of the spec).
///      This removes the need for any cron-like "refresh" transaction.
contract PolicyRegistry is AccessControl {
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    uint256 public constant INSTALMENT_PERIOD = 30 days;

    /// @notice Admin-configurable grace period applied after a missed
    ///         instalment / pay-later deadline before a policy lapses.
    ///         Defaults to 14 days per the spec's design assumption.
    uint256 public graceDays = 14 days;

    enum PolicyType { Motor, Medical, Life }
    enum PaymentMode { PayNow, Instalment, PayLater }
    enum PolicyStatus { PendingPayment, Active, GracePeriod, Lapsed, Expired }
    enum Reason {
        OK,
        POLICY_NOT_FOUND,
        WRONG_OWNER,
        TYPE_MISMATCH,
        OUTSIDE_COVERAGE_PERIOD,
        INVALID_DATE,
        POLICY_NOT_ACTIVE,
        POLICY_LAPSED,
        POLICY_EXPIRED
    }

    struct Policy {
        bytes32 holderId;          // pseudonymous, not a wallet
        PolicyType policyType;
        uint32 planId;
        uint64 startDate;
        uint64 endDate;
        PaymentMode mode;
        uint8 totalInstalments;    // 1 for PayNow / PayLater
        uint8 paidInstalments;
        uint64 payDeadline;        // used by PayLater only
        uint256 previousPolicyId;  // 0 for a new purchase
        uint256 premium;           // sample amount in sen
    }

    uint256 public policyCount;
    mapping(uint256 => Policy) public policies;

    error PolicyNotFound();
    error PayLaterNotAllowedOnCreate();
    error PolicyLapsedOrExpired();
    error RenewalNotEligible();
    error InvalidInstalmentCount();

    event PolicyCreated(
        uint256 indexed policyId,
        bytes32 indexed holderId,
        PolicyType policyType,
        PaymentMode mode
    );

    event PaymentRecorded(
        uint256 indexed policyId,
        uint256 amount,
        bytes32 refHash,
        uint8 instalmentNumber
    );

    event PolicyRenewed(
        uint256 indexed oldPolicyId,
        uint256 indexed newPolicyId,
        PaymentMode mode
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ---------------------------------------------------------------
    // Admin configuration
    // ---------------------------------------------------------------

    /// @notice Update the grace period (in days) applied after a missed
    ///         payment / pay-later deadline. Admin only.
    function setGraceDays(uint256 newGraceDays) external onlyRole(DEFAULT_ADMIN_ROLE) {
        graceDays = newGraceDays * 1 days;
    }

    // ---------------------------------------------------------------
    // Relayer-only writes
    // ---------------------------------------------------------------

    function createPolicy(
        bytes32 holderId,
        PolicyType policyType,
        uint32 planId,
        PaymentMode mode,
        uint8 totalInstalments,
        uint256 premium
    ) external onlyRole(RELAYER_ROLE) returns (uint256 policyId) {
        if (mode == PaymentMode.PayLater) revert PayLaterNotAllowedOnCreate();
        if (totalInstalments == 0) revert InvalidInstalmentCount();
        if (mode != PaymentMode.Instalment && totalInstalments != 1) {
            revert InvalidInstalmentCount();
        }

        policyId = ++policyCount;
        uint64 start = uint64(block.timestamp);
        uint64 end = start + 365 days;

        policies[policyId] = Policy({
            holderId: holderId,
            policyType: policyType,
            planId: planId,
            startDate: start,
            endDate: end,
            mode: mode,
            totalInstalments: totalInstalments,
            paidInstalments: 0,
            payDeadline: 0,
            previousPolicyId: 0,
            premium: premium
        });

        emit PolicyCreated(policyId, holderId, policyType, mode);
    }

    function recordPayment(
        uint256 policyId,
        uint256 amount,
        bytes32 refHash
    ) external onlyRole(RELAYER_ROLE) {
        Policy storage p = policies[policyId];
        if (p.holderId == bytes32(0)) revert PolicyNotFound();

        PolicyStatus status = effectiveStatus(policyId);
        if (status == PolicyStatus.Lapsed || status == PolicyStatus.Expired) {
            revert PolicyLapsedOrExpired();
        }

        p.paidInstalments += 1;
        emit PaymentRecorded(policyId, amount, refHash, p.paidInstalments);
    }

    function renewPolicy(
        uint256 oldPolicyId,
        PaymentMode mode,
        uint8 totalInstalments,
        uint256 premium
    ) external onlyRole(RELAYER_ROLE) returns (uint256 newPolicyId) {
        Policy storage old = policies[oldPolicyId];
        if (old.holderId == bytes32(0)) revert PolicyNotFound();

        PolicyStatus oldStatus = effectiveStatus(oldPolicyId);
        if (oldStatus != PolicyStatus.Active && oldStatus != PolicyStatus.GracePeriod) {
            revert RenewalNotEligible();
        }
        if (block.timestamp + 30 days < old.endDate) {
            // Only allow renewal within 30 days of the old policy's end date.
            revert RenewalNotEligible();
        }
        if (totalInstalments == 0) revert InvalidInstalmentCount();
        if (mode != PaymentMode.Instalment && totalInstalments != 1) {
            revert InvalidInstalmentCount();
        }

        newPolicyId = ++policyCount;
        uint64 start = old.endDate;
        uint64 end = start + 365 days;

        Policy storage np = policies[newPolicyId];
        np.holderId = old.holderId;
        np.policyType = old.policyType;
        np.planId = old.planId;
        np.startDate = start;
        np.endDate = end;
        np.mode = mode;
        np.totalInstalments = totalInstalments;
        np.paidInstalments = 0;
        np.previousPolicyId = oldPolicyId;
        np.premium = premium;

        if (mode == PaymentMode.PayLater) {
            np.payDeadline = start + uint64(graceDays);
        }

        emit PolicyRenewed(oldPolicyId, newPolicyId, mode);
    }

    // ---------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------

    /// @notice Computes the policy's status from timestamps at read time.
    /// @dev No StatusChanged event exists for this contract: since status is
    ///      never stored, there is no on-chain transition to emit an event
    ///      for (see spec Section 4.3). Any consumer that needs to know the
    ///      current status simply calls this view function.
    function effectiveStatus(uint256 id) public view returns (PolicyStatus) {
        Policy storage p = policies[id];
        if (p.holderId == bytes32(0)) revert PolicyNotFound();
        if (block.timestamp > p.endDate) return PolicyStatus.Expired;

        // Renew first, pay later
        if (p.mode == PaymentMode.PayLater) {
            if (p.paidInstalments >= 1) return PolicyStatus.Active;
            return block.timestamp <= p.payDeadline
                ? PolicyStatus.GracePeriod
                : PolicyStatus.Lapsed;
        }

        // Pay now / instalment
        if (p.paidInstalments == 0) return PolicyStatus.PendingPayment;
        if (p.paidInstalments >= p.totalInstalments) return PolicyStatus.Active;

        uint256 elapsed = block.timestamp > p.startDate ? block.timestamp - p.startDate : 0;
        uint256 dueCount = 1 + elapsed / INSTALMENT_PERIOD;
        if (dueCount > p.totalInstalments) dueCount = p.totalInstalments;
        if (p.paidInstalments >= dueCount) return PolicyStatus.Active;

        uint256 missedDue = p.startDate + uint256(p.paidInstalments) * INSTALMENT_PERIOD;
        return block.timestamp <= missedDue + graceDays
            ? PolicyStatus.GracePeriod
            : PolicyStatus.Lapsed;
    }

    function isEligible(
        uint256 policyId,
        bytes32 holderId,
        PolicyType claimType,
        uint64 incidentDate
    ) public view returns (bool ok, Reason reason) {
        Policy storage p = policies[policyId];
        if (p.holderId == bytes32(0)) {
            return (false, Reason.POLICY_NOT_FOUND);
        }
        if (p.holderId != holderId) {
            return (false, Reason.WRONG_OWNER);
        }
        if (p.policyType != claimType) {
            return (false, Reason.TYPE_MISMATCH);
        }
        if (incidentDate > block.timestamp) {
            return (false, Reason.INVALID_DATE);
        }
        if (incidentDate < p.startDate || incidentDate > p.endDate) {
            return (false, Reason.OUTSIDE_COVERAGE_PERIOD);
        }

        PolicyStatus status = effectiveStatus(policyId);
        if (status == PolicyStatus.Active || status == PolicyStatus.GracePeriod) {
            return (true, Reason.OK);
        }
        if (status == PolicyStatus.Lapsed) {
            return (false, Reason.POLICY_LAPSED);
        }
        if (status == PolicyStatus.Expired) {
            return (false, Reason.POLICY_EXPIRED);
        }
        return (false, Reason.POLICY_NOT_ACTIVE);
    }

    /// @notice Returns every stored field of a policy in a single call, for
    ///         off-chain consumers (backend/frontend) that need to render
    ///         full policy details rather than just the computed status.
    function getPolicy(uint256 policyId) external view returns (Policy memory) {
        Policy storage p = policies[policyId];
        if (p.holderId == bytes32(0)) revert PolicyNotFound();
        return p;
    }
}
