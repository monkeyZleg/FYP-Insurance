"use client";

import { CalculatorRegular, DocumentRegular, MoneyRegular, ShieldCheckmarkRegular } from "@fluentui/react-icons";

const KEY_POINTS = [
  {
    Icon: CalculatorRegular,
    title: "It is an estimate, not a final price",
    body: "The first quote can change if the insurer verifies your information or finds details you missed during a final underwriting review.",
  },
  {
    Icon: DocumentRegular,
    title: "It is not legally binding",
    body: "You are not forced to buy the policy, and the insurer is not locked into that exact price until you formally apply and a policy is issued.",
  },
  {
    Icon: MoneyRegular,
    title: "It is free",
    body: "Requesting a quote does not cost any money.",
  },
  {
    Icon: ShieldCheckmarkRegular,
    title: "It does not hurt your credit",
    body: "Getting a standard quote does not lower your credit score.",
  },
];

/** Plain-language explainer shown under every quote page. */
export default function QuoteExplainer() {
  return (
    <section aria-labelledby="quote-explainer" className="mx-auto max-w-[1100px] px-4 pb-16 sm:px-8">
      <p className="t-eyebrow mb-3">Good to know</p>
      <h2 id="quote-explainer" className="font-display text-[clamp(24px,3vw,34px)] font-semibold leading-[1.15] tracking-[-0.02em] text-fg">
        What is an insurance quote?
      </h2>
      <p className="mt-3 max-w-3xl t-body-large text-fg-2">
        An insurance quote is a free, estimated price for an insurance policy, based on your personal information, your risk profile and the
        coverage you choose. When you get a quote, you ask an insurer to work out how much you would pay (your premium) before you actually buy
        the policy.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {KEY_POINTS.map((k) => (
          <li key={k.title} className="card flex gap-4 p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[var(--accent-subtle-strong)] text-accent-text">
              <k.Icon fontSize={20} aria-hidden />
            </span>
            <div>
              <h3 className="t-body-strong text-fg">{k.title}</h3>
              <p className="mt-1 t-body text-fg-2">{k.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
