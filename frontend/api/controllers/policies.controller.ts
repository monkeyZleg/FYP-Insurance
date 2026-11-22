import { send } from "../client";
import { run } from "../run";
import { policyRoutes } from "../routes/policies.routes";
import type {
  ClaimEligibilityResult,
  InsuranceType,
  PaymentMode,
  PolicyPayment,
  PolicyPlan,
  PolicyRow,
} from "@/types";

export const listPlans = () =>
  run("policies.listPlans", () => send<{ plans: PolicyPlan[] }>(policyRoutes.plans));

export const myPolicies = (token: string) =>
  run("policies.myPolicies", () => send<{ policies: PolicyRow[] }>(policyRoutes.mine, { auth: { token } }));

export const createPolicy = (
  token: string,
  planId: number,
  paymentMode: Exclude<PaymentMode, "PayLater">,
  instalmentCount?: number
) =>
  run("policies.createPolicy", () =>
    send<{ policy: PolicyRow; txHash: string }>(policyRoutes.create, {
      auth: { token },
      body: { planId, paymentMode, instalmentCount },
    })
  );

export const payPolicy = (token: string, policyId: string) =>
  run("policies.payPolicy", () =>
    send<{ policy: PolicyRow; txHash: string }>(policyRoutes.pay(policyId), { auth: { token }, body: {} })
  );

export const renewPolicy = (token: string, policyId: string, paymentMode: PaymentMode, instalmentCount?: number) =>
  run("policies.renewPolicy", () =>
    send<{ policy: PolicyRow; txHash: string }>(policyRoutes.renew(policyId), {
      auth: { token },
      body: { paymentMode, instalmentCount },
    })
  );

/** Every payment recorded on-chain for one policy. */
export const policyPayments = (token: string, policyId: string) =>
  run("policies.policyPayments", () =>
    send<{ payments: PolicyPayment[] }>(policyRoutes.payments(policyId), { auth: { token } })
  );

export const checkEligibility = (token: string, policyId: string, insuranceType: InsuranceType, incidentDate: string) =>
  run("policies.checkEligibility", () =>
    send<ClaimEligibilityResult>(policyRoutes.eligibility(policyId), {
      auth: { token },
      query: { insuranceType, incidentDate },
    })
  );
