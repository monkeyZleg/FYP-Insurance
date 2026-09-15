# BEICVS — Blockchain-Enhanced Insurance Claim Verification System

**Student:** Leong Seng Khuan (TP070856) | **Program:** BSc (Hons) Computer Science | **APU**

## Overview

BEICVS is a web-based blockchain-enhanced insurance claim verification system that replaces centralized, opaque claim records with a tamper-proof, independently verifiable audit trail on the Ethereum blockchain.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + React + Tailwind CSS |
| Backend | Node.js + Express.js |
| Blockchain | Solidity + Hardhat + Ethers.js v6 |
| Wallet | MetaMask |
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
- `backend/.env` — Supabase keys, blockchain RPC, JWT secret
- `frontend/.env.local` — Public Supabase + contract addresses

### 3. Set Up Database

Run `database/schema.sql` in your Supabase SQL editor.

### 4. Compile & Deploy Contracts

```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network hardhat
```

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

| Role | Capabilities |
|---|---|
| Policyholder | Submit claims, upload documents, track status |
| Verifier | Review assigned claims, approve/reject |
| Admin | Manage users, assign claims to verifiers |
| Auditor | Read-only blockchain audit trail, hash verification |

## License

MIT
