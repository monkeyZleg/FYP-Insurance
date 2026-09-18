# BEICVS — Blockchain-Enhanced Insurance Claim Verification System

**Student:** Leong Seng Khuan (TP070856) | **Program:** BSc (Hons) Computer Science | **APU**

## Overview

BEICVS is a web-based blockchain-enhanced insurance claim verification system that replaces centralized, opaque claim records with a tamper-proof, independently verifiable audit trail on the Ethereum blockchain.

It also includes a policyholder Policy Module (buy, renew, pay for a policy — simulated payments) that gates claim eligibility, per `policyholder-policy-module.md` and `smart-contract-spec-hybrid.md`.

## Hybrid Signing Model (Option B)

Not every user has a crypto wallet, so the contracts separate **who acts** from **who signs**:

| Actor | Login | Signs blockchain transactions with |
|---|---|---|
| Policyholder | Email + password (Supabase Auth) | **Backend relayer wallet**, on their behalf. Represented on-chain by a pseudonymous `holderId`, never a wallet address. |
| Verifier / Admin / Auditor | MetaMask | Their own wallet (`VERIFIER_ROLE` / `ADMIN_ROLE` / `AUDITOR_ROLE`) |

Two contracts: `PolicyRegistry.sol` ("is this policy valid?") and `ClaimRegistry.sol` ("what happened to this claim?", calls `PolicyRegistry.isEligible()` before accepting a claim). See `smart-contract-spec-hybrid.md` for the full spec, permission matrix and security considerations.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + React + Tailwind CSS |
| Backend | Node.js + Express.js (relayer wallet for policyholder actions) |
| Blockchain | Solidity + Hardhat + OpenZeppelin AccessControl + Ethers.js v6 |
| Wallet | MetaMask (staff only) |
| Auth | Supabase Auth — email/password (policyholders), wallet signature (staff) |
| Database | Supabase (PostgreSQL) |
| File Storage | Supabase Storage |

## Project Structure

```
beicvs/
├── contracts/          # Solidity smart contracts
├── scripts/            # Hardhat deployment scripts
├── test/               # Smart contract tests
├── backend/            # Node.js + Express API
├── frontend/           # Next.js app
├── database/           # SQL schema files
└── hardhat.config.js
```

## Quick Start

### 1. Install Dependencies

```bash
# Root (Hardhat)
npm install

# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### 2. Configure Environment

Copy `.env.example` files and fill in your values:
- `backend/.env` — Supabase service key, `HOLDER_ID_SALT` (pseudonymous holder ID salt — generate once, never change after policyholders register), `RELAYER_PRIVATE_KEY` (backend-held wallet that signs every policyholder action), `POLICY_REGISTRY_ADDRESS` / `CLAIM_REGISTRY_ADDRESS` (from step 4), JWT secret
- `frontend/.env.local` — Public Supabase + `NEXT_PUBLIC_CLAIM_REGISTRY_ADDRESS` (staff MetaMask calls)

### 3. Set Up Database

Run `database/schema.sql` in your Supabase SQL editor, and enable email/password sign-ups under Supabase Auth settings.

### 4. Compile & Deploy Contracts

```bash
npx hardhat compile
RELAYER_ADDRESS=0x... npx hardhat run scripts/deploy.js --network hardhat
```

`scripts/deploy.js` deploys `PolicyRegistry` then `ClaimRegistry`, grants `RELAYER_ROLE` on both to `RELAYER_ADDRESS` (falls back to a dev test account if unset — set it to the address matching your backend's `RELAYER_PRIVATE_KEY`), and grants `ADMIN_ROLE`/`VERIFIER_ROLE`/`AUDITOR_ROLE` to Hardhat test accounts for local demo purposes. Copy the logged addresses into `backend/.env`.

### 5. Run Tests

```bash
npx hardhat test
```

### 6. Start Development Servers

```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

## User Roles

| Role | Login | Capabilities |
|---|---|---|
| Policyholder | Email + password | Buy/renew/pay for a policy, submit claims, upload documents, track status |
| Verifier | MetaMask | Review assigned claims, approve/reject |
| Admin | MetaMask | Manage users, assign claims to verifiers, settle approved claims |
| Auditor | MetaMask | Read-only blockchain audit trail, hash verification, flag claims for investigation |

## License

MIT
