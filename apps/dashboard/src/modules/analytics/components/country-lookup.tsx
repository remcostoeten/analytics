"use client";

import { useId, useState } from "react";
import type { KeyboardEvent } from "react";

import { formatMetric } from "../format";
import { fuzzyScore } from "../fuzzy";

export type LookupOption = { code: string; name: string; value: number };

type Props = {
  options: readonly LookupOption[];
  pinned: readonly string[];
  onPick: (code: string) => void;
  onHover: (code: string) => void;
};

const limit = 6;

function matches(query: string, options: readonly LookupOption[]) {
  if (query.trim() === "") {
    return options
      .filter((option) => option.value > 0)
      .toSorted((left, right) => right.value - left.value)
      .slice(0, limit);
  }
  return options
    .flatMap((option) => {
      const byName = fuzzyScore(query, option.name);
      const byCode = fuzzyScore(query, option.code);
      const best = Math.max(byName ?? -1, byCode === null ? -1 : byCode - 100);
      return best < 0 ? [] : [{ option, best }];
    })
    .toSorted((left, right) => right.best - left.best || right.option.value - left.option.value)
    .slice(0, limit)
    .map((entry) => entry.option);
}

export function CountryLookup({ options, pinned, onPick, onHover }: Props) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const found = matches(query, options);
  const current = Math.min(index, Math.max(0, found.length - 1));

  function pick(option: LookupOption | undefined) {
    if (!option) return;
    onPick(option.code);
    setQuery("");
    setOpen(false);
    onHover("");
  }

  function move(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = (current + step + found.length) % Math.max(1, found.length);
      setIndex(next);
      onHover(found[next]?.code ?? "");
    } else if (event.key === "Enter") {
      event.preventDefault();
      pick(found[current]);
    } else if (event.key === "Escape") {
      setOpen(false);
      onHover("");
    }
  }

  return (
    <div className="country-lookup">
      <input
        type="text"
        role="combobox"
        className="country-lookup-input"
        placeholder="Find a country"
        autoComplete="off"
        spellCheck={false}
        aria-label="Find a country"
        aria-expanded={open}
        aria-controls={id}
        aria-autocomplete="list"
        aria-activedescendant={open && found.length > 0 ? `${id}-${current}` : undefined}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIndex(0);
          setOpen(true);
          onHover("");
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          onHover("");
        }}
        onKeyDown={move}
      />
      {open && found.length > 0 ? (
        <ul id={id} role="listbox" className="popover country-lookup-list">
          {found.map((option, position) => (
            <li
              key={option.code}
              id={`${id}-${position}`}
              role="option"
              aria-selected={position === current}
              className="country-lookup-option"
              onPointerEnter={() => {
                setIndex(position);
                onHover(option.code);
              }}
              onPointerDown={(event) => {
                event.preventDefault();
                pick(option);
              }}
            >
              <span>{option.name}</span>
              <span className="country-lookup-meta tabular-nums">
                {pinned.includes(option.code)
                  ? "Pinned"
                  : option.value > 0
                    ? formatMetric(option.value, "count")
                    : "No visits"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {open && found.length === 0 && query.trim() !== "" ? (
        <p className="popover country-lookup-list country-lookup-empty">No matching country</p>
      ) : null}
    </div>
  );
}
