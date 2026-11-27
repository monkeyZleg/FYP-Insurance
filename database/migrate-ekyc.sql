-- eKYC (electronic Know Your Customer) for policyholders.
-- Run once against an existing database; fresh installs get this from schema.sql.
--
-- A policyholder submits their MyKad number, a photo of the front (and
-- optionally back) of the card and a selfie. The backend runs automatic
-- checks (IC format, date of birth, age >= 18, name match, image checks);
-- an admin then compares the selfie with the IC photo and verifies or
-- rejects. Face matching / liveness is simulated by that manual review.
--
-- Like claims, identity data stays off-chain: a public chain can't delete
-- personal data (PDPA). The full IC number is never stored — only a masked
-- copy for display and a keyed hash (HMAC-SHA256) used to stop one IC being
-- used for two accounts.

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
