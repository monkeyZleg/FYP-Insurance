-- BEICVS Database Schema (Supabase/PostgreSQL)
-- Run these statements in the Supabase SQL editor

-- Users table
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address  TEXT UNIQUE NOT NULL,
  full_name       TEXT,
  email           TEXT UNIQUE,
  role            TEXT NOT NULL CHECK (role IN ('policyholder','verifier','admin','auditor')),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Policies table
CREATE TABLE policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policyholder_id UUID REFERENCES users(id),
  policy_number   TEXT UNIQUE NOT NULL,
  policy_type     TEXT NOT NULL,
  coverage_amount NUMERIC,
  start_date      DATE,
  end_date        DATE,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Claims table (off-chain record mirrors on-chain)
CREATE TABLE claims (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blockchain_claim_id  TEXT,
  tx_hash              TEXT,
  policy_id            UUID REFERENCES policies(id),
  policyholder_id      UUID REFERENCES users(id),
  insurance_type       TEXT CHECK (insurance_type IN ('health','life','transportation','flight')),
  claim_type           TEXT NOT NULL,
  description          TEXT,
  incident_date        DATE,
  details              JSONB DEFAULT '{}'::jsonb,
  status               TEXT DEFAULT 'Pending'
                       CHECK (status IN ('Pending','UnderReview','Approved','Rejected')),
  assigned_verifier_id UUID REFERENCES users(id),
  verifier_remark      TEXT,
  document_hash        TEXT,
  submitted_at         TIMESTAMPTZ DEFAULT now(),
  last_updated_at      TIMESTAMPTZ DEFAULT now()
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

-- Row Level Security: policyholders only see their own claims
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Policyholders see own claims"
  ON claims FOR SELECT
  USING (auth.uid() = policyholder_id);

-- Create Supabase Storage bucket for claim documents
-- Run this in the Supabase dashboard: Storage > Create bucket > "claim-documents"
