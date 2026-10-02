"use client";

import { useState } from "react";

import { ledger } from "../content";

export function Ledger() {
  const [open, setOpen] = useState<string | null>(ledger[0]?.index ?? null);
  return (
    <section id="index" className="border-b border-[#2a2a2e]">
      <div className="mono grid grid-cols-[80px_1fr_auto] items-center gap-6 border-b border-[#2a2a2e] px-8 py-4 text-[10px] tracking-[0.2em] text-[#5a5a60] uppercase lg:px-12">
        <span>No.</span>
        <span>Index</span>
        <span>Command</span>
      </div>
      {ledger.map((row) => {
        const expanded = open === row.index;
        return (
          <button
            type="button"
            key={row.index}
            onClick={() => setOpen(expanded ? null : row.index)}
            data-open={expanded}
            className="group grid w-full grid-cols-[80px_1fr_auto] items-start gap-6 border-b border-[#2a2a2e] px-8 py-6 text-left transition-colors last:border-b-0 hover:bg-[#0e0e10] data-[open=true]:bg-[#0e0e10] lg:px-12"
          >
            <span className="mono pt-2 text-[11px] text-[#5a5a60] transition-colors group-hover:text-[#d8ff3a] group-data-[open=true]:text-[#d8ff3a]">
              {row.index}
            </span>
            <span>
              <span className="font-display block text-[32px] leading-[1.05] text-[#f2f1ed] transition-transform duration-300 group-hover:translate-x-2 md:text-[40px]">
                {row.name}
              </span>
              <span className="mt-1 block text-[14px] text-[#9a9a9f]">{row.summary}</span>
              <span
                data-open={expanded}
                className="grid transition-[grid-template-rows] duration-400 ease-out data-[open=false]:grid-rows-[0fr] data-[open=true]:grid-rows-[1fr]"
              >
                <span className="overflow-hidden">
                  <span className="mt-4 block max-w-xl border-l border-[#d8ff3a] pl-4 text-[14px] leading-[1.7] text-[#c4c4c9]">
                    {row.detail}
                  </span>
                </span>
              </span>
            </span>
            <span className="mono pt-2 text-[11px] text-[#5a5a60] transition-colors group-hover:text-[#f2f1ed]">
              <span className="text-[#d8ff3a]">$ </span>
              {row.command}
            </span>
          </button>
        );
      })}
    </section>
  );
}
