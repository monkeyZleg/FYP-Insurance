// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AccessControl {
    bytes32 public constant POLICYHOLDER = keccak256("POLICYHOLDER");
    bytes32 public constant VERIFIER     = keccak256("VERIFIER");
    bytes32 public constant ADMIN        = keccak256("ADMIN");
    bytes32 public constant AUDITOR      = keccak256("AUDITOR");

    address public owner;

    mapping(address => bytes32) public roles;

    event RoleAssigned(address indexed wallet, bytes32 role, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyRole(bytes32 role) {
        require(roles[msg.sender] == role, "Unauthorized role");
        _;
    }

    constructor() {
        owner = msg.sender;
        roles[msg.sender] = ADMIN;
    }

    function assignRole(address wallet, bytes32 role) external onlyOwner {
        roles[wallet] = role;
        emit RoleAssigned(wallet, role, block.timestamp);
    }

    function getRole(address wallet) external view returns (bytes32) {
        return roles[wallet];
    }

    function hasRole(address wallet, bytes32 role) external view returns (bool) {
        return roles[wallet] == role;
    }
}
