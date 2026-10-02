"use client";

import { useState } from "react";

import { plans } from "../content";

export function Plans() {
  const [hot, setHot] = useState(1);
  return (
    <section id="pricing" className="grid border-b border-[#2a2a2e] md:grid-cols-3">
      {plans.map((plan, index) => (
        <div
          key={plan.name}
          onPointerEnter={() => setHot(index)}
          data-hot={hot === index}
          className="group flex min-h-[520px] flex-col border-b border-[#2a2a2e] p-8 transition-colors duration-300 last:border-b-0 data-[hot=true]:bg-[#d8ff3a] data-[hot=true]:text-[#070708] md:border-r md:border-b-0 md:last:border-r-0 lg:p-12"
        >
          <p className="mono text-[11px] tracking-[0.2em] uppercase">{plan.name}</p>
          <p className="font-display mt-10 text-[96px] leading-none">
            {plan.price !== "Talk" ? <span className="text-[40px] align-top">€</span> : null}
            {plan.price}
          </p>
          <p className="mono mt-2 text-[11px] tracking-[0.2em] uppercase opacity-60">{plan.unit}</p>
          <ul className="mono mt-10 space-y-2 text-[12px]">
            {plan.lines.map((line) => (
              <li key={line} className="flex gap-3">
                <span className="opacity-50">+</span>
                {line}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mono mt-auto border border-current px-5 py-3 text-[11px] tracking-[0.2em] uppercase transition-transform group-data-[hot=true]:translate-x-2"
          >
            Choose {plan.name} →
          </button>
        </div>
      ))}
    </section>
  );
}
