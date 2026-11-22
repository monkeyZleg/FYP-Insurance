const db = require("./db");
const { getPoliciesOnChain, getPolicyCreateTxHashes } = require("./policyChainService");
const { getPlan } = require("../constants/policyPlans");

/*
 * A policy's terms, instalments, status and payments live only in
 * PolicyRegistry. The database keeps just the link to the account that owns
 * it and the display number (POL-CAR-2026-12345), which is not on-chain.
 * This joins the two into the policy object the frontend uses.
 */

function merge(row, chain, createTx, previousIds) {
  return {
    // database
    id: row.id,
    on_chain_policy_id: row.on_chain_policy_id,
    policyholder_id: row.policyholder_id,
    holder_id: row.holder_id,
    policy_number: row.policy_number,
    created_at: row.created_at,
    // blockchain
    policy_type: chain.policyType,
    plan_id: chain.planId,
    plan_name: getPlan(chain.planId)?.name ?? `Plan ${chain.planId}`,
    premium: chain.premiumRM,
    payment_mode: chain.paymentMode,
    total_instalments: chain.totalInstalments,
    paid_instalments: chain.paidInstalments,
    start_date: chain.startDate,
    end_date: chain.endDate,
    pay_deadline: chain.payDeadline,
    status: chain.status,
    previous_policy_id: chain.previousOnChainPolicyId ? previousIds.get(chain.previousOnChainPolicyId) ?? null : null,
    create_tx_hash: createTx ?? null,
  };
}

/** Joins database policy rows with their on-chain records, in the order given. */
async function buildPolicyViews(rows) {
  const live = rows.filter((r) => r.on_chain_policy_id != null);
  if (live.length === 0) return [];
  const ids = live.map((r) => r.on_chain_policy_id);

  const [chains, txHashes] = await Promise.all([getPoliciesOnChain(ids), getPolicyCreateTxHashes(ids)]);

  // Renewals point at the previous policy by its on-chain id; the app links by database id.
  const previousOnChain = [...new Set(chains.map((c) => c.previousOnChainPolicyId).filter(Boolean))];
  const previousIds = new Map();
  if (previousOnChain.length > 0) {
    const data = await db.query("SELECT id, on_chain_policy_id FROM policies WHERE on_chain_policy_id = ANY($1::bigint[])", [
      previousOnChain.map(String),
    ]);
    for (const p of data) previousIds.set(String(p.on_chain_policy_id), p.id);
  }

  return live.map((row, i) => merge(row, chains[i], txHashes.get(String(row.on_chain_policy_id)), previousIds));
}

module.exports = { buildPolicyViews };
