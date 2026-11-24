# BEICVS — Blockchain-Enhanced Insurance Claim Verification System

**Student:** Leong Seng Khuan (TP070856) | **Program:** BSc (Hons) Computer Science | **APU**

## Overview

BEICVS is a web-based blockchain-enhanced insurance claim verification system that replaces centralized, opaque claim records with a tamper-proof, independently verifiable audit trail on the Ethereum blockchain.

It also includes a policyholder Policy Module (buy, renew, pay for a policy — simulated payments) that gates claim eligibility, per `policyholder-policy-module.md` and `smart-contract-spec-hybrid.md`.

## Hybrid Signing Model (Option B)

Not every user has a crypto wallet, so the contracts separate **who acts** from **who signs**:

| Actor | Login | Signs blockchain transactions with |
|---|---|---|
| Policyholder | Email + password (hashed with scrypt in the `users` table) | **Backend relayer wallet**, on their behalf. Represented on-chain by a pseudonymous `holderId`, never a wallet address. |
| Verifier / Admin / Auditor | Email + password (accounts created by an admin) | Their own wallet in MetaMask (`VERIFIER_ROLE` / `ADMIN_ROLE` / `AUDITOR_ROLE`), connected from the dashboard only when they act on-chain |

Two contracts: `PolicyRegistry.sol` ("is this policy valid?") and `ClaimRegistry.sol` ("what happened to this claim?", calls `PolicyRegistry.isEligible()` before accepting a claim). See `smart-contract-spec-hybrid.md` for the full spec, permission matrix and security considerations.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + React + Tailwind CSS |
| Backend | Node.js + Express.js (relayer wallet for policyholder actions) |
| Blockchain | Solidity + Hardhat + OpenZeppelin AccessControl + Ethers.js v6 |
| Wallet | MetaMask (staff, for signing on-chain actions only) |
| Auth | Email/password with scrypt + JWT for every role; the login page asks which role you're signing in as |
| Database | Aiven for PostgreSQL 18: accounts, uploaded files, claim form text only |
| File Storage | Stored in the `documents` table (`file_data`), next to each file's SHA-256 hash |

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
- `backend/.env` — `DATABASE_URL` (Aiven Service URI) and `DATABASE_CA_CERT` (path to the service's `ca.pem`), `HOLDER_ID_SALT` (pseudonymous holder ID salt — generate once, never change after policyholders register), `RELAYER_PRIVATE_KEY` (backend-held wallet that signs every policyholder action), `POLICY_REGISTRY_ADDRESS` / `CLAIM_REGISTRY_ADDRESS` (from step 4), JWT secret
- `frontend/.env.local` — `NEXT_PUBLIC_CLAIM_REGISTRY_ADDRESS` (staff MetaMask calls)

### 3. Set Up Database

The database is the Aiven for PostgreSQL service `fyp-insurance-pg` (Developer plan, Singapore). Run `database/schema.sql` against it (Aiven console > Query editor, or `psql "$DATABASE_URL" -f database/schema.sql`), then `database/seed.sql` for the demo accounts (all use password `Demo@12345`: `admin@beicvs.demo`, `verifier@beicvs.demo`, `auditor@beicvs.demo`, `demo@beicvs.demo`). A database set up before staff had passwords needs `database/migrate-staff-password.sql` once.

**The blockchain is the record of every claim and policy transaction.** Claim and policy status, assigned verifier, decision, approved payout, service charge, net payout, flags, payments and the audit trail are read from the contracts, never copied into the database. The database keeps only what a public, permanent chain shouldn't hold: login accounts, the claim form the policyholder filled in, uploaded files and the verifier's written remark (the chain stores the hashes, and the server re-hashes the stored data on every claim view to detect tampering).

The older `migrate-*.sql` files were for the previous Supabase database and are not needed on Aiven.

### 4. Compile & Deploy Contracts

```bash
npx hardhat compile

# Terminal 1 - start the local blockchain and leave it running
npm run node

# Terminal 2 - deploy both contracts to it
npm run deploy:local
```

`npm run node` prints 20 test accounts with their private keys. The deploy script uses account #1 as the relayer (put its private key in `backend/.env` as `RELAYER_PRIVATE_KEY`), #2 as admin, #3 as verifier and #4 as auditor (import those into MetaMask, network `http://127.0.0.1:8545`, chain ID `31337`). Restarting the node wipes the chain, so redeploy and clear the old policy/claim rows afterwards.

`scripts/deploy.js` deploys `PolicyRegistry` then `ClaimRegistry`, grants `RELAYER_ROLE` on both to `RELAYER_ADDRESS` (falls back to a dev test account if unset — set it to the address matching your backend's `RELAYER_PRIVATE_KEY`), and grants `ADMIN_ROLE`/`VERIFIER_ROLE`/`AUDITOR_ROLE` to Hardhat test accounts for local demo purposes. It prints ready-to-paste lines for `backend/.env` and `frontend/.env.local` and saves the addresses to `deployments/localhost.json`.

### What the contracts cover

| Feature | On-chain |
|---|---|
| Insurance types | `PolicyType { Car, Motor, Travel, Health }` - the same four as the claim form and quote pages |
| Buy / renew / pay (pay now, instalments, pay later) | `PolicyRegistry.createPolicy` / `renewPolicy` / `recordPayment`; status computed from timestamps |
| Claim eligibility | `PolicyRegistry.isEligible` - owner, type, coverage dates, policy status |
| Tamper prevention | Document and claim-form hashes stored with the claim; `verifyDocument` |
| Duplicate claim detection | Same document hash, or same policy + type + incident date, is refused |
| Amount claimed | `claimedAmount` (sen) - the approved payout can never exceed it |
| Verifier decision | `decideClaim` with the approved payout |
| Service charge at payout | `settleClaim` computes the charge (default 2%, min RM 10, max RM 200) and stores payout, charge and net; admin can change it with `setServiceCharge` |
| Audit trail | Every step emits an event; auditors can `flagClaim` |

Existing database: run `database/migrate-chain-v2.sql` once.

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
| Verifier | Email + password | Review assigned claims, approve/reject |
| Admin | Email + password | Manage users, assign claims to verifiers, settle approved claims |
| Auditor | Email + password | Read-only blockchain audit trail, hash verification, flag claims for investigation |

## License

MIT
