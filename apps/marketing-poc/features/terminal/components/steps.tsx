"use client";

import { useEffect, useRef, useState } from "react";

import type { Step } from "../content";
import { steps } from "../content";

const boardColumns = [
  { name: "TODO", items: ["1038", "1100", "1034"] },
  { name: "IN PROGRESS", items: ["1036", "1029"] },
  { name: "DONE", items: ["1012", "1009", "1004", "0998"] },
];

function Visual({ state }: { state: Step["state"] }) {
  const columns = boardColumns.map((column) => {
    if (state === "board") return column;
    if (state === "merge" && column.name === "TODO")
      return { ...column, items: column.items.filter((item) => item !== "1038") };
    if (state === "merge" && column.name === "IN PROGRESS")
      return { ...column, items: ["1038", ...column.items] };
    if (state === "done" && column.name === "TODO")
      return { ...column, items: column.items.filter((item) => item !== "1038") };
    if (state === "done" && column.name === "IN PROGRESS") return { ...column, items: ["1029"] };
    if (state === "done" && column.name === "DONE")
      return { ...column, items: ["1038", "1036", ...column.items] };
    return column;
  });
  return (
    <div className="mono grid h-full grid-cols-3 gap-px bg-[#2a2a2e] text-[11px]">
      {columns.map((column) => (
        <div key={column.name} className="flex flex-col gap-2 bg-[#070708] p-4">
          <p className="mb-2 flex items-center justify-between tracking-[0.2em] text-[#5a5a60] uppercase">
            {column.name}
            <span className="tabular-nums">{column.items.length}</span>
          </p>
          {column.items.map((item) => (
            <div
              key={item}
              data-hot={item === "1038"}
              className="flex items-center justify-between border border-[#2a2a2e] px-3 py-2 text-[#c4c4c9] transition-all duration-500 data-[hot=true]:border-[#d8ff3a] data-[hot=true]:text-[#d8ff3a]"
            >
              TICKET-{item}
              {item === "1038" && state !== "board" ? (
                <span className="text-[9px]">{state === "merge" ? "PR #418" : "MERGED"}</span>
              ) : null}
            </div>
          ))}
        </div>
      ))}
      <div className="col-span-3 flex items-center justify-between bg-[#070708] px-4 py-3 tracking-[0.2em] text-[#5a5a60] uppercase">
        <span>
          {state === "board"
            ? "waiting for a branch"
            : state === "merge"
              ? "feat/webhooks → checks running"
              : "merged · 2 dependents unblocked"}
        </span>
        <span className={state === "done" ? "text-[#d8ff3a]" : ""}>
          {state === "done" ? "● live" : "○ idle"}
        </span>
      </div>
    </div>
  );
}

export function Steps() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number(entry.target.getAttribute("data-index"));
          setActive(index);
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((element) => element && observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="product" className="grid border-b border-[#2a2a2e] lg:grid-cols-2">
      <div className="border-[#2a2a2e] lg:border-r">
        {steps.map((step, index) => (
          <div
            key={step.index}
            ref={(element) => {
              refs.current[index] = element;
            }}
            data-index={index}
            data-active={active === index}
            className="group flex min-h-[70vh] flex-col justify-center border-b border-[#2a2a2e] p-8 transition-opacity duration-500 last:border-b-0 data-[active=false]:opacity-30 lg:p-12"
          >
            <span className="mono text-[11px] tracking-[0.2em] text-[#d8ff3a]">{step.index}</span>
            <h2 className="font-display mt-4 text-[44px] leading-[1] text-[#f2f1ed] md:text-[64px]">
              {step.title}
            </h2>
            <p className="mt-6 max-w-md text-[16px] leading-[1.6] text-[#9a9a9f]">{step.body}</p>
          </div>
        ))}
      </div>
      <div className="relative hidden lg:block">
        <div className="sticky top-[49px] h-[calc(100vh-49px)] p-12">
          <div className="mono mb-4 flex justify-between text-[10px] tracking-[0.2em] text-[#5a5a60] uppercase">
            <span>fig. 02 · board</span>
            <span>state {steps[active]?.index ?? "01"} / 03</span>
          </div>
          <div className="h-[calc(100%-32px)]">
            <Visual state={steps[active]?.state ?? "board"} />
          </div>
        </div>
      </div>
    </section>
  );
}
