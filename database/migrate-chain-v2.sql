-- Contracts v2: on-chain types are now Car / Motor / Travel / Health, and
-- ClaimRegistry records the claimed amount, approved payout, service charge
-- and net payout. Run once on an existing database (Supabase SQL editor).

-- 1. Money figures mirrored from the contract (RM).
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claimed_amount  NUMERIC;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS approved_payout NUMERIC;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS service_charge  NUMERIC;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS net_payout      NUMERIC;

-- 2. Policy types. Old 'motor' plans were car plans (plan ids 1-3 are
--    unchanged); old 'medical' plans 4-6 are now health plans 10-12.
--    'medical' / 'life' stay allowed only so old rows don't break.
ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_policy_type_check;
UPDATE policies SET policy_type = 'car' WHERE policy_type = 'motor' AND plan_id BETWEEN 1 AND 3;
UPDATE policies SET policy_type = 'health', plan_id = plan_id + 6,
                    plan_name = replace(plan_name, 'Medical', 'Health')
  WHERE policy_type = 'medical';
ALTER TABLE policies ADD CONSTRAINT policies_policy_type_check
  CHECK (policy_type IN ('car','motor','travel','health','medical','life'));

-- 3. IMPORTANT: redeploying the contracts starts a brand-new chain, so the
--    on_chain_policy_id / on_chain_claim_id values of existing rows no
--    longer point at anything. For a clean demo, clear the old test data
--    (uncomment to run):
-- TRUNCATE audit_log, documents, claims, policy_payments, policies;
