"use client";

import { useState } from "react";

import { customers } from "../content";
import { Icon } from "./icons";

function Wordmark({ name, weight }: { name: string; weight: "bold" | "serif" | "wide" }) {
  const styles = {
    bold: "text-[20px] font-bold tracking-tight",
    serif: "font-display text-[24px] tracking-tight",
    wide: "text-[15px] font-medium tracking-[0.18em] uppercase",
  };
  return <span className={styles[weight]}>{name}</span>;
}

export function Customers() {
  const [hovered, setHovered] = useState<number | null>(null);
  const column = hovered === null ? 2 : hovered % 5;
  const rowOffset = hovered === null || hovered < 5 ? 0 : 90;

  return (
    <section className="px-8 pt-8 pb-24">
      <div className="relative mx-auto max-w-[1180px]">
        <span
          className="eyebrow pointer-events-none absolute top-0 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 border border-line-strong bg-ink-panel px-3 py-1 text-mist transition-[left,top] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
          style={{ left: `${column * 20 + 10}%`, top: rowOffset }}
        >
          Case study
          <Icon name="arrow-ne" size={10} />
        </span>
        <div className="grid grid-cols-2 border border-line-strong md:grid-cols-5">
          {customers.map((customer, index) => (
            <button
              type="button"
              key={customer.name}
              onPointerEnter={() => setHovered(index)}
              onPointerLeave={() => setHovered(null)}
              className="logo-cell flex h-[90px] items-center justify-center gap-2 border-line-strong text-fog/80 not-last:border-r max-md:nth-[2n]:border-r-0 max-md:not-nth-last-[-n+2]:border-b md:not-nth-last-[-n+5]:border-b md:nth-[5n]:border-r-0"
            >
              <span className="flex size-5 items-center justify-center rounded-[3px] bg-current/40 transition-transform duration-300 hover:rotate-12">
                <span className="size-2 rounded-[1px] bg-ink" />
              </span>
              <Wordmark name={customer.name} weight={customer.weight} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
