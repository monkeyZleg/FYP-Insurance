// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAccessControl {
    function hasRole(address wallet, bytes32 role) external view returns (bool);
}

contract ClaimRegistry {
    IAccessControl public accessControl;

    bytes32 constant POLICYHOLDER = keccak256("POLICYHOLDER");
    bytes32 constant VERIFIER     = keccak256("VERIFIER");
    bytes32 constant AUDITOR      = keccak256("AUDITOR");

    enum ClaimStatus { Pending, UnderReview, Approved, Rejected }

    struct Claim {
        bytes32     claimId;
        address     policyHolder;
        bytes32     documentHash;
        string      claimType;
        uint256     submittedAt;
        ClaimStatus status;
        address     assignedVerifier;
        string      verifierRemark;
        uint256     lastUpdatedAt;
    }

    mapping(bytes32 => Claim) public claims;
    mapping(address => bytes32[]) public policyholderClaims;
    bytes32[] public allClaimIds;

    event ClaimSubmitted(
        bytes32 indexed claimId,
        address indexed policyHolder,
        bytes32 documentHash,
        string  claimType,
        uint256 timestamp
    );

    event ClaimAssigned(
        bytes32 indexed claimId,
        address indexed verifier,
        uint256 timestamp
    );

    event ClaimStatusUpdated(
        bytes32 indexed claimId,
        ClaimStatus newStatus,
        address indexed updatedBy,
        string  remark,
        uint256 timestamp
    );

    constructor(address _accessControl) {
        accessControl = IAccessControl(_accessControl);
    }

    function submitClaim(
        bytes32 documentHash,
        string calldata claimType
    ) external returns (bytes32 claimId) {
        require(
            accessControl.hasRole(msg.sender, POLICYHOLDER),
            "Only policyholders can submit claims"
        );

        claimId = keccak256(
            abi.encodePacked(msg.sender, documentHash, block.timestamp)
        );

        claims[claimId] = Claim({
            claimId:          claimId,
            policyHolder:     msg.sender,
            documentHash:     documentHash,
            claimType:        claimType,
            submittedAt:      block.timestamp,
            status:           ClaimStatus.Pending,
            assignedVerifier: address(0),
            verifierRemark:   "",
            lastUpdatedAt:    block.timestamp
        });

        policyholderClaims[msg.sender].push(claimId);
        allClaimIds.push(claimId);

        emit ClaimSubmitted(claimId, msg.sender, documentHash, claimType, block.timestamp);
    }

    function assignClaim(bytes32 claimId, address verifier) external {
        claims[claimId].assignedVerifier = verifier;
        claims[claimId].status           = ClaimStatus.UnderReview;
        claims[claimId].lastUpdatedAt    = block.timestamp;

        emit ClaimAssigned(claimId, verifier, block.timestamp);
    }

    function updateClaimStatus(
        bytes32 claimId,
        bool    approved,
        string  calldata remark
    ) external {
        require(
            accessControl.hasRole(msg.sender, VERIFIER),
            "Only verifiers can update claim status"
        );
        require(
            claims[claimId].assignedVerifier == msg.sender,
            "Not assigned to this claim"
        );

        claims[claimId].status         = approved ? ClaimStatus.Approved : ClaimStatus.Rejected;
        claims[claimId].verifierRemark = remark;
        claims[claimId].lastUpdatedAt  = block.timestamp;

        emit ClaimStatusUpdated(
            claimId,
            claims[claimId].status,
            msg.sender,
            remark,
            block.timestamp
        );
    }

    function getClaim(bytes32 claimId) external view returns (Claim memory) {
        return claims[claimId];
    }

    function getClaimsByPolicyholder(address wallet)
        external view returns (bytes32[] memory)
    {
        return policyholderClaims[wallet];
    }

    function getAllClaimIds() external view returns (bytes32[] memory) {
        return allClaimIds;
    }

    function verifyDocumentHash(
        bytes32 claimId,
        bytes32 hashToCheck
    ) external view returns (bool) {
        return claims[claimId].documentHash == hashToCheck;
    }
}
