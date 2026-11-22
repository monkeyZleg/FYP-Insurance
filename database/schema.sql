-- BEICVS Database Schema (Aiven for PostgreSQL)
-- Run these statements against the Aiven service (defaultdb).
--
-- Hybrid signing model (Option B): policyholders authenticate with
-- email + password (scrypt hash in users.password_hash) and are represented on-chain by a
-- pseudonymous holder_id, never a wallet address. Staff (verifier,
-- admin, auditor) still authenticate with MetaMask and keep a
-- wallet_address. See smart-contract-spec-hybrid.md.

-- Users table
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Staff only (verifier/admin/auditor). NULL for policyholders.
  wallet_address  TEXT UNIQUE,
  -- Policyholders only: the password hash ("salt:hash", scrypt) and the
  -- pseudonymous on-chain identifier derived from users.id. NULL for staff.
  password_hash   TEXT,
  holder_id       TEXT UNIQUE,
  full_name       TEXT,
  email           TEXT UNIQUE,
  role            TEXT NOT NULL CHECK (role IN ('policyholder','verifier','admin','auditor')),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT users_identity_check CHECK (
    (role = 'policyholder' AND password_hash IS NOT NULL AND holder_id IS NOT NULL AND wallet_address IS NULL)
    OR
    (role <> 'policyholder' AND wallet_address IS NOT NULL AND password_hash IS NULL AND holder_id IS NULL)
  )
);

-- Policies table. Only the link between an on-chain policy and its owner.
-- The plan, premium, payment mode, instalments, dates, status and every
-- payment live in PolicyRegistry.sol and are read from the chain.
CREATE TABLE policies (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  on_chain_policy_id   BIGINT UNIQUE NOT NULL,
  policyholder_id      UUID REFERENCES users(id),
  holder_id            TEXT NOT NULL,
  policy_number        TEXT UNIQUE NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- Claims table: the case file only. Status, assigned verifier, decision,
-- approved payout, service charge, net payout, flags, document and form
-- hashes and the full history live in ClaimRegistry.sol and are read from
-- the chain. Personal details stay here because a public chain can't delete
-- them; the chain holds only their hashes.
CREATE TABLE claims (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  on_chain_claim_id      BIGINT UNIQUE NOT NULL,
  policy_id              UUID REFERENCES policies(id),
  policyholder_id        UUID REFERENCES users(id),
  holder_id              TEXT NOT NULL,
  insurance_type         TEXT CHECK (insurance_type IN ('car','motor','travel','health')),
  claim_type             TEXT NOT NULL,
  description            TEXT,
  incident_date          DATE,
  details                JSONB DEFAULT '{}'::jsonb,
  -- Written by the verifier after deciding; only accepted if it hashes to the remarkHash on-chain.
  verifier_remark        TEXT
);

-- Documents table: the uploaded file itself (file_data) and its SHA-256
-- hash, which the contract also recorded at submission.
CREATE TABLE documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id    UUID REFERENCES claims(id),
  file_name   TEXT NOT NULL,
  mime_type   TEXT,
  file_hash   TEXT NOT NULL,
  file_data   BYTEA NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Access control is done by the backend: every policyholder query filters
-- on the holder_id in their login token, and staff routes check the role.
CREATE INDEX claims_holder_id_idx ON claims (holder_id);
CREATE INDEX policies_holder_id_idx ON policies (holder_id);
CREATE INDEX documents_claim_id_idx ON documents (claim_id);
