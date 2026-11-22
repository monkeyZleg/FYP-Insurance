const db = require("../services/db");
const { getPlan, POLICY_PLANS } = require("../constants/policyPlans");
const { CLAIM_TO_POLICY_TYPE } = require("../constants/insuranceMap");
const {
  createPolicyOnChain,
  recordPaymentOnChain,
  renewPolicyOnChain,
  getPolicyOnChain,
  getPaymentHistory,
  checkEligibility,
  ChainError,
} = require("../services/policyChainService");
const { buildPolicyViews } = require("../services/policyView");

/*
 * Where policy data lives
 *   blockchain  PolicyRegistry: plan, premium, payment mode, instalments paid,
 *               start / end / pay-by dates, status (computed from time), and
 *               every payment as an event.
 *   database    only the link to the owning account and the display number.
 * Reads join the two in services/policyView.js.
 */

function genPolicyNumber(type) {
  const rand = Math.floor(Math.random() * 90000 + 10000);
  return `POL-${type.toUpperCase()}-${new Date().getFullYear()}-${rand}`;
}

function chainReadFailed(res, err) {
  return res.status(503).json({ error: `Could not read the blockchain: ${err.shortMessage || err.message}` });
}

/** The caller's own policy row (database link only), or null. */
async function findOwnPolicy(id, holderId) {
  return db.one("SELECT * FROM policies WHERE id = $1 AND holder_id = $2", [id, holderId]);
}

/** Save the database link for a policy just created on-chain. */
function insertPolicyLink(onChainPolicyId, user, type) {
  return db.one(
    `INSERT INTO policies (on_chain_policy_id, policyholder_id, holder_id, policy_number) VALUES ($1, $2, $3, $4) RETURNING *`,
    [onChainPolicyId, user.userId, user.holderId, genPolicyNumber(type)]
  );
}

async function listPlans(req, res) {
  res.json({ plans: POLICY_PLANS });
}

async function createPolicy(req, res) {
  const { planId, paymentMode, instalmentCount } = req.body;
  const plan = getPlan(planId);
  if (!plan) return res.status(400).json({ error: "Unknown plan" });
  if (paymentMode === "PayLater")
    return res.status(400).json({ error: "Pay later is only available when renewing an existing policy" });

  const instalments = paymentMode === "Instalment" ? Number(instalmentCount) || 3 : 1;

  let onChain;
  try {
    onChain = await createPolicyOnChain(req.user.holderId, plan.type, plan.planId, paymentMode, instalments, plan.premiumRM);
  } catch (err) {
    if (err instanceof ChainError) return res.status(400).json({ error: err.code });
    return res.status(500).json({ error: err.message });
  }

  let row;
  try {
    row = await insertPolicyLink(onChain.onChainPolicyId, req.user, plan.type);
  } catch (err) {
    return res.status(500).json({
      error: `Policy #${onChain.onChainPolicyId} was recorded on-chain, but saving its account link failed: ${err.message}`,
    });
  }

  try {
    const [policy] = await buildPolicyViews([row]);
    res.status(201).json({ policy, txHash: onChain.txHash });
  } catch (err) {
    chainReadFailed(res, err);
  }
}

async function recordPayment(req, res) {
  const row = await findOwnPolicy(req.params.id, req.user.holderId);
  if (!row) return res.status(404).json({ error: "Policy not found" });

  let chain;
  try {
    chain = await getPolicyOnChain(row.on_chain_policy_id);
  } catch (err) {
    return chainReadFailed(res, err);
  }

  const amount =
    chain.paymentMode === "Instalment" ? Math.round((chain.premiumRM / chain.totalInstalments) * 100) / 100 : chain.premiumRM;

  let onChain;
  try {
    onChain = await recordPaymentOnChain(row.on_chain_policy_id, amount);
  } catch (err) {
    if (err instanceof ChainError) return res.status(400).json({ error: err.code });
    return res.status(500).json({ error: err.message });
  }

  try {
    const [policy] = await buildPolicyViews([row]);
    res.json({ policy, txHash: onChain.txHash });
  } catch (err) {
    chainReadFailed(res, err);
  }
}

async function renewPolicy(req, res) {
  const { paymentMode, instalmentCount } = req.body;

  const old = await findOwnPolicy(req.params.id, req.user.holderId);
  if (!old) return res.status(404).json({ error: "Policy not found" });

  let oldChain;
  try {
    oldChain = await getPolicyOnChain(old.on_chain_policy_id);
  } catch (err) {
    return chainReadFailed(res, err);
  }

  const instalments = paymentMode === "Instalment" ? Number(instalmentCount) || 3 : 1;

  let onChain;
  try {
    onChain = await renewPolicyOnChain(old.on_chain_policy_id, paymentMode, instalments, oldChain.premiumRM);
  } catch (err) {
    if (err instanceof ChainError) return res.status(400).json({ error: err.code });
    return res.status(500).json({ error: err.message });
  }

  let row;
  try {
    row = await insertPolicyLink(onChain.onChainPolicyId, req.user, oldChain.policyType);
  } catch (err) {
    return res.status(500).json({
      error: `Policy #${onChain.onChainPolicyId} was recorded on-chain, but saving its account link failed: ${err.message}`,
    });
  }

  try {
    const [policy] = await buildPolicyViews([row]);
    res.status(201).json({ policy, txHash: onChain.txHash });
  } catch (err) {
    chainReadFailed(res, err);
  }
}

async function getMyPolicies(req, res) {
  let rows;
  try {
    rows = await db.query("SELECT * FROM policies WHERE holder_id = $1 ORDER BY created_at DESC", [req.user.holderId]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  try {
    res.json({ policies: await buildPolicyViews(rows) });
  } catch (err) {
    chainReadFailed(res, err);
  }
}

/** Every payment recorded on-chain for one of the caller's policies. */
async function getPayments(req, res) {
  const row = await findOwnPolicy(req.params.id, req.user.holderId);
  if (!row) return res.status(404).json({ error: "Policy not found" });

  try {
    res.json({ payments: await getPaymentHistory(row.on_chain_policy_id) });
  } catch (err) {
    chainReadFailed(res, err);
  }
}

async function getEligibility(req, res) {
  const { id } = req.params;
  const { insuranceType, incidentDate } = req.query;

  const mappedType = CLAIM_TO_POLICY_TYPE[insuranceType];
  if (!mappedType)
    return res.json({ eligible: false, reasonCode: "TYPE_MISMATCH", message: "This insurance type has no matching policy plan" });

  const policy = await db.one("SELECT on_chain_policy_id FROM policies WHERE id = $1", [id]);
  if (!policy) return res.status(404).json({ error: "Policy not found" });

  const result = await checkEligibility(policy.on_chain_policy_id, req.user.holderId, mappedType, incidentDate);
  res.json(result);
}

module.exports = { listPlans, createPolicy, recordPayment, renewPolicy, getMyPolicies, getPayments, getEligibility };
