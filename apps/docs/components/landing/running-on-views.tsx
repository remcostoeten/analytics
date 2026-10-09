"use client";

import { useId, useState, type ReactNode } from "react";

import { ArrowUpRightIcon } from "./icons";

type View = "cards" | "json";

type Props = {
  intro: ReactNode;
  cards: ReactNode;
  json: ReactNode;
  endpoint: string;
};

const views: { value: View; label: string }[] = [
  { value: "cards", label: "Cards" },
  { value: "json", label: "JSON" },
];

export function RunningOnViews({ intro, cards, json, endpoint }: Props) {
  const [view, setView] = useState<View>("cards");
  const id = useId();
  return (
    <>
      <div className="reveal flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        {intro}
        <div
          role="tablist"
          aria-label="Show the projects as"
          className="flex w-fit rounded-full border border-line bg-surface p-1"
        >
          {views.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              id={`${id}-${option.value}-tab`}
              aria-selected={view === option.value}
              aria-controls={`${id}-${option.value}`}
              onClick={() => setView(option.value)}
              className={`rounded-full px-4 py-1.5 text-[0.8rem] font-medium transition-colors ${view === option.value ? "bg-[var(--pill-bg)] text-[var(--pill-fg)]" : "text-muted hover:text-fg"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div
        role="tabpanel"
        id={`${id}-cards`}
        aria-labelledby={`${id}-cards-tab`}
        hidden={view !== "cards"}
        className="mt-12"
      >
        {cards}
      </div>
      <div
        role="tabpanel"
        id={`${id}-json`}
        aria-labelledby={`${id}-json-tab`}
        hidden={view !== "json"}
        className="json-peek animate-rise mt-12"
      >
        <div className="visual-frame rounded-2xl p-3 sm:p-6">{json}</div>
        <a
          href={endpoint}
          rel="noreferrer"
          className="link-line mt-4 inline-flex items-center gap-1.5 font-mono text-[0.75rem] text-muted"
        >
          {endpoint}
          <ArrowUpRightIcon className="size-3.5" />
        </a>
      </div>
    </>
  );
}
