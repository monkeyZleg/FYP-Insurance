-- BEICVS Database Schema (Aiven for PostgreSQL)
-- Run these statements against the Aiven service (defaultdb).
--
-- Every role signs in with email + password (scrypt hash in
-- users.password_hash). On-chain, policyholders are a pseudonymous holder_id
-- (the backend relayer signs for them), while staff (verifier, admin,
-- auditor) keep a wallet_address that signs their own actions with MetaMask.
-- See smart-contract-spec-hybrid.md.

-- Users table
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Staff only (verifier/admin/auditor): the wallet that signs their
  -- on-chain actions. NULL for policyholders.
  wallet_address  TEXT UNIQUE,
  -- Login password for every role ("salt:hash", scrypt).
  password_hash   TEXT,
  -- Policyholders only: pseudonymous on-chain identifier derived from users.id.
  holder_id       TEXT UNIQUE,
  full_name       TEXT,
  email           TEXT UNIQUE,
  role            TEXT NOT NULL CHECK (role IN ('policyholder','verifier','admin','auditor')),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT users_identity_check CHECK (
    (role = 'policyholder' AND password_hash IS NOT NULL AND holder_id IS NOT NULL AND wallet_address IS NULL)
    OR
    (role <> 'policyholder' AND wallet_address IS NOT NULL AND holder_id IS NULL)
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

-- eKYC identity verification for policyholders (see migrate-ekyc.sql for notes).
CREATE TABLE IF NOT EXISTS ekyc_submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name        TEXT NOT NULL,                 -- name as printed on the IC
  ic_number_masked TEXT NOT NULL,                 -- e.g. 990101-14-****
  ic_hash          TEXT NOT NULL,                 -- HMAC-SHA256 of the 12 digits
  date_of_birth    DATE NOT NULL,                 -- decoded from the IC
  gender           TEXT CHECK (gender IN ('male','female')),
  ic_front         BYTEA NOT NULL,
  ic_front_mime    TEXT NOT NULL,
  ic_front_hash    TEXT NOT NULL,                 -- SHA-256 of the image
  ic_back          BYTEA,
  ic_back_mime     TEXT,
  ic_back_hash     TEXT,
  selfie           BYTEA NOT NULL,
  selfie_mime      TEXT NOT NULL,
  selfie_hash      TEXT NOT NULL,
  checks           JSONB DEFAULT '{}'::jsonb,     -- result of each automatic check
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  reject_reason    TEXT,
  reviewed_by      UUID REFERENCES users(id),
  reviewed_at      TIMESTAMPTZ,
  submitted_at     TIMESTAMPTZ DEFAULT now()
);

-- One live (pending or verified) submission per account, and per IC number:
-- the same MyKad can't verify two accounts. Rejected ones may be resubmitted.
CREATE UNIQUE INDEX IF NOT EXISTS ekyc_live_user_uniq ON ekyc_submissions (user_id) WHERE status IN ('pending','verified');
CREATE UNIQUE INDEX IF NOT EXISTS ekyc_live_ic_uniq   ON ekyc_submissions (ic_hash) WHERE status IN ('pending','verified');
CREATE INDEX IF NOT EXISTS ekyc_status_idx ON ekyc_submissions (status, submitted_at);
