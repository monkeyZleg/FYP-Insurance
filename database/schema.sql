-- BEICVS Database Schema (Supabase/PostgreSQL)
-- Run these statements in the Supabase SQL editor
--
-- Hybrid signing model (Option B): policyholders authenticate with
-- email + password (Supabase Auth) and are represented on-chain by a
-- pseudonymous holder_id, never a wallet address. Staff (verifier,
-- admin, auditor) still authenticate with MetaMask and keep a
-- wallet_address. See smart-contract-spec-hybrid.md.

-- Users table
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Staff only (verifier/admin/auditor). NULL for policyholders.
  wallet_address  TEXT UNIQUE,
  -- Policyholders only: the Supabase Auth user id (auth.users.id) and
  -- the pseudonymous on-chain identifier derived from it. NULL for staff.
  auth_user_id    UUID UNIQUE,
  holder_id       TEXT UNIQUE,
  full_name       TEXT,
  email           TEXT UNIQUE,
  role            TEXT NOT NULL CHECK (role IN ('policyholder','verifier','admin','auditor')),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT users_identity_check CHECK (
    (role = 'policyholder' AND auth_user_id IS NOT NULL AND holder_id IS NOT NULL AND wallet_address IS NULL)
    OR
    (role <> 'policyholder' AND wallet_address IS NOT NULL AND auth_user_id IS NULL AND holder_id IS NULL)
  )
);

-- Policies table (off-chain mirror of PolicyRegistry.sol)
CREATE TABLE policies (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  on_chain_policy_id   BIGINT UNIQUE,
  policyholder_id      UUID REFERENCES users(id),
  holder_id            TEXT NOT NULL,
  policy_number        TEXT UNIQUE NOT NULL,
  policy_type          TEXT NOT NULL CHECK (policy_type IN ('motor','medical','life')),
  plan_id              SMALLINT NOT NULL,
  plan_name            TEXT NOT NULL,
  premium              NUMERIC NOT NULL,
  payment_mode         TEXT NOT NULL CHECK (payment_mode IN ('PayNow','Instalment','PayLater')),
  total_instalments    SMALLINT NOT NULL DEFAULT 1,
  paid_instalments     SMALLINT NOT NULL DEFAULT 0,
  start_date           DATE NOT NULL,
  end_date             DATE NOT NULL,
  pay_deadline         DATE,
  status               TEXT NOT NULL DEFAULT 'PendingPayment'
                       CHECK (status IN ('PendingPayment','Active','GracePeriod','Lapsed','Expired')),
  previous_policy_id   UUID REFERENCES policies(id),
  create_tx_hash       TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  last_synced_at       TIMESTAMPTZ DEFAULT now()
);

-- Policy payments table (off-chain detail behind each on-chain PaymentRecorded event)
CREATE TABLE policy_payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id    UUID REFERENCES policies(id),
  amount       NUMERIC NOT NULL,
  ref_hash     TEXT NOT NULL,
  instalment_number SMALLINT,
  tx_hash      TEXT,
  paid_at      TIMESTAMPTZ DEFAULT now()
);

-- Claims table (off-chain record mirrors ClaimRegistry.sol)
CREATE TABLE claims (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  on_chain_claim_id      BIGINT UNIQUE,
  submit_tx_hash         TEXT,
  policy_id              UUID REFERENCES policies(id),
  policyholder_id        UUID REFERENCES users(id),
  holder_id              TEXT NOT NULL,
  insurance_type         TEXT CHECK (insurance_type IN ('health','life','transportation','flight')),
  claim_type             TEXT NOT NULL,
  description            TEXT,
  incident_date          DATE,
  details                JSONB DEFAULT '{}'::jsonb,
  details_hash           TEXT,
  doc_hashes             JSONB DEFAULT '[]'::jsonb,
  status                 TEXT DEFAULT 'Submitted'
                         CHECK (status IN ('Submitted','UnderReview','Approved','Rejected','Settled')),
  assigned_verifier_id   UUID REFERENCES users(id),
  assign_tx_hash         TEXT,
  decided_by_wallet      TEXT,
  decide_tx_hash         TEXT,
  decided_at             TIMESTAMPTZ,
  verifier_remark        TEXT,
  reason_code            SMALLINT,
  settle_tx_hash         TEXT,
  settled_at             TIMESTAMPTZ,
  flagged                BOOLEAN DEFAULT false,
  flag_tx_hash           TEXT,
  document_hash          TEXT,
  submitted_at           TIMESTAMPTZ DEFAULT now(),
  last_updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Documents table (file references, actual files in Supabase Storage)
CREATE TABLE documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id    UUID REFERENCES claims(id),
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  file_hash   TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log table (mirrors blockchain events for fast off-chain queries)
CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id     UUID REFERENCES claims(id),
  action       TEXT NOT NULL,
  performed_by UUID REFERENCES users(id),
  tx_hash      TEXT,
  block_number BIGINT,
  timestamp    TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security: policyholders only see their own claims and policies
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Policyholders see own claims"
  ON claims FOR SELECT
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = policyholder_id));

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Policyholders see own policies"
  ON policies FOR SELECT
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = policyholder_id));

-- Create Supabase Storage bucket for claim documents
-- Run this in the Supabase dashboard: Storage > Create bucket > "claim-documents"
