const supabase = require("../services/supabaseService");
const { getPlan, POLICY_PLANS } = require("../constants/policyPlans");
const { CLAIM_TO_POLICY_TYPE } = require("../constants/insuranceMap");
const {
  createPolicyOnChain,
  recordPaymentOnChain,
  renewPolicyOnChain,
  getEffectiveStatus,
  checkEligibility,
  ChainError,
} = require("../services/policyChainService");

function genPolicyNumber(type) {
  const rand = Math.floor(Math.random() * 90000 + 10000);
  return `POL-${type.toUpperCase()}-${new Date().getFullYear()}-${rand}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
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

  const start = new Date();
  const end = addDays(start, 365);

  const { data: policy, error } = await supabase
    .from("policies")
    .insert({
      on_chain_policy_id: onChain.onChainPolicyId,
      policyholder_id: req.user.id,
      holder_id: req.user.holderId,
      policy_number: genPolicyNumber(plan.type),
      policy_type: plan.type,
      plan_id: plan.planId,
      plan_name: plan.name,
      premium: plan.premiumRM,
      payment_mode: paymentMode,
      total_instalments: instalments,
      paid_instalments: 0,
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      status: "PendingPayment",
      create_tx_hash: onChain.txHash,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ policy, txHash: onChain.txHash });
}

async function recordPayment(req, res) {
  const { id } = req.params;

  const { data: policy, error: fetchErr } = await supabase
    .from("policies")
    .select("*")
    .eq("id", id)
    .eq("holder_id", req.user.holderId)
    .single();

  if (fetchErr || !policy) return res.status(404).json({ error: "Policy not found" });

  const amount =
    policy.payment_mode === "Instalment" ? Math.round((policy.premium / policy.total_instalments) * 100) / 100 : policy.premium;

  let onChain;
  try {
    onChain = await recordPaymentOnChain(policy.on_chain_policy_id, amount);
  } catch (err) {
    if (err instanceof ChainError) return res.status(400).json({ error: err.code });
    return res.status(500).json({ error: err.message });
  }

  const status = await getEffectiveStatus(policy.on_chain_policy_id);
  const paidInstalments = policy.paid_instalments + 1;

  const { data: updated, error } = await supabase
    .from("policies")
    .update({ paid_instalments: paidInstalments, status, last_synced_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("policy_payments").insert({
    policy_id: id,
    amount,
    ref_hash: onChain.refHash,
    instalment_number: paidInstalments,
    tx_hash: onChain.txHash,
  });

  res.json({ policy: updated, txHash: onChain.txHash });
}

async function renewPolicy(req, res) {
  const { id } = req.params;
  const { paymentMode, instalmentCount } = req.body;

  const { data: old, error: fetchErr } = await supabase
    .from("policies")
    .select("*")
    .eq("id", id)
    .eq("holder_id", req.user.holderId)
    .single();

  if (fetchErr || !old) return res.status(404).json({ error: "Policy not found" });

  const instalments = paymentMode === "Instalment" ? Number(instalmentCount) || 3 : 1;

  let onChain;
  try {
    onChain = await renewPolicyOnChain(old.on_chain_policy_id, paymentMode, instalments, old.premium);
  } catch (err) {
    if (err instanceof ChainError) return res.status(400).json({ error: err.code });
    return res.status(500).json({ error: err.message });
  }

  const status = await getEffectiveStatus(onChain.onChainPolicyId);
  const start = new Date(old.end_date) > new Date() ? new Date(old.end_date) : new Date();
  const end = addDays(start, 365);
  const payDeadline = status === "GracePeriod" ? addDays(new Date(), 14) : null;

  const { data: renewed, error } = await supabase
    .from("policies")
    .insert({
      on_chain_policy_id: onChain.onChainPolicyId,
      policyholder_id: req.user.id,
      holder_id: req.user.holderId,
      policy_number: genPolicyNumber(old.policy_type),
      policy_type: old.policy_type,
      plan_id: old.plan_id,
      plan_name: old.plan_name,
      premium: old.premium,
      payment_mode: paymentMode,
      total_instalments: instalments,
      paid_instalments: 0,
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      pay_deadline: payDeadline ? payDeadline.toISOString().slice(0, 10) : null,
      status,
      previous_policy_id: id,
      create_tx_hash: onChain.txHash,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ policy: renewed, txHash: onChain.txHash });
}

async function getMyPolicies(req, res) {
  const { data: policies, error } = await supabase
    .from("policies")
    .select("*")
    .eq("holder_id", req.user.holderId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const refreshed = await Promise.all(
    policies.map(async (p) => {
      try {
        const status = await getEffectiveStatus(p.on_chain_policy_id);
        if (status !== p.status) {
          await supabase.from("policies").update({ status, last_synced_at: new Date().toISOString() }).eq("id", p.id);
          return { ...p, status };
        }
        return p;
      } catch {
        return p;
      }
    })
  );

  res.json({ policies: refreshed });
}

async function getEligibility(req, res) {
  const { id } = req.params;
  const { insuranceType, incidentDate } = req.query;

  const mappedType = CLAIM_TO_POLICY_TYPE[insuranceType];
  if (!mappedType)
    return res.json({ eligible: false, reasonCode: "TYPE_MISMATCH", message: "This insurance type has no matching policy plan" });

  const { data: policy, error } = await supabase.from("policies").select("*").eq("id", id).single();
  if (error || !policy) return res.status(404).json({ error: "Policy not found" });

  const result = await checkEligibility(policy.on_chain_policy_id, req.user.holderId, mappedType, incidentDate);
  res.json(result);
}

module.exports = { listPlans, createPolicy, recordPayment, renewPolicy, getMyPolicies, getEligibility };
