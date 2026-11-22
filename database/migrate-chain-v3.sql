-- Blockchain as the record of every claim and policy transaction.
-- Run once on an existing database (Supabase SQL editor), AFTER
-- migrate-chain-v2.sql if you have not run that yet.
--
-- Claim and policy status, amounts, payments, decisions, flags and the audit
-- trail are now read from the blockchain only. The database keeps the case
-- file: who filed it, the form they filled in, uploaded files, and the
-- verifier's written remark.
--
-- IMPORTANT: this DROPS the copied columns and the mirror tables. Redeploying
-- the contracts starts a new chain, so old on_chain ids point at nothing; clear
-- the old test rows first (uncomment), or you will have rows with no
-- blockchain record, which the app skips.
-- TRUNCATE documents, claims, policies;

ALTER TABLE claims
  DROP COLUMN IF EXISTS submit_tx_hash,
  DROP COLUMN IF EXISTS details_hash,
  DROP COLUMN IF EXISTS doc_hashes,
  DROP COLUMN IF EXISTS claimed_amount,
  DROP COLUMN IF EXISTS approved_payout,
  DROP COLUMN IF EXISTS service_charge,
  DROP COLUMN IF EXISTS net_payout,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS assigned_verifier_id,
  DROP COLUMN IF EXISTS assign_tx_hash,
  DROP COLUMN IF EXISTS decided_by_wallet,
  DROP COLUMN IF EXISTS decide_tx_hash,
  DROP COLUMN IF EXISTS decided_at,
  DROP COLUMN IF EXISTS reason_code,
  DROP COLUMN IF EXISTS settle_tx_hash,
  DROP COLUMN IF EXISTS settled_at,
  DROP COLUMN IF EXISTS flagged,
  DROP COLUMN IF EXISTS flag_tx_hash,
  DROP COLUMN IF EXISTS document_hash,
  DROP COLUMN IF EXISTS submitted_at,
  DROP COLUMN IF EXISTS last_updated_at;

ALTER TABLE policies
  DROP COLUMN IF EXISTS policy_type,
  DROP COLUMN IF EXISTS plan_id,
  DROP COLUMN IF EXISTS plan_name,
  DROP COLUMN IF EXISTS premium,
  DROP COLUMN IF EXISTS payment_mode,
  DROP COLUMN IF EXISTS total_instalments,
  DROP COLUMN IF EXISTS paid_instalments,
  DROP COLUMN IF EXISTS start_date,
  DROP COLUMN IF EXISTS end_date,
  DROP COLUMN IF EXISTS pay_deadline,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS previous_policy_id,
  DROP COLUMN IF EXISTS create_tx_hash,
  DROP COLUMN IF EXISTS last_synced_at;

DROP TABLE IF EXISTS policy_payments;
DROP TABLE IF EXISTS audit_log;
