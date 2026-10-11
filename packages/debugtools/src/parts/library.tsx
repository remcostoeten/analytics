import { useState } from "react";

import { Icon } from "../icons";
import type { Dataset, FieldKind, QuickQuery } from "../types";
import { hideScrollbarClass, iconButtonClass, paneClass, paneHeadClass } from "./pane";

const kindBadge: { [Kind in FieldKind]: string } = {
  string: "S",
  number: "N",
  boolean: "B",
  time: "T",
};

const searchClass =
  "flex h-9.5 flex-none items-center gap-2 border-b border-console-divider px-3 text-console-dim focus-within:text-console-muted";
const inputClass =
  "h-full min-w-0 flex-1 text-[12.5px] text-console-fg outline-none placeholder:text-console-dim focus-visible:outline-none";
const listClass = `spc-fade min-h-0 flex-1 overflow-y-auto p-1.5 font-console-mono text-xs ${hideScrollbarClass}`;
const captionClass = "block px-1.5 pt-1.5 pb-[3px] text-[11.5px] text-console-dim";
const rowClass =
  "flex h-6.5 w-full items-center gap-2 rounded-[5px] px-1.5 text-left text-console-muted aria-[current=true]:bg-console-raised aria-[current=true]:text-console-fg";
const buttonRowClass = `${rowClass} hover:bg-console-hover hover:text-console-fg`;
const labelClass = "min-w-0 flex-1 truncate";

function matches(value: string, search: string) {
  return value.toLowerCase().includes(search.trim().toLowerCase());
}

type Props = {
  datasets: Dataset[];
  quickQueries: QuickQuery[];
  onQuickQuery: () => void;
  className?: string;
};

export function Library({ datasets, quickQueries, onQuickQuery, className }: Props) {
  const [selected, setSelected] = useState(datasets[0]?.name ?? "");
  const [datasetSearch, setDatasetSearch] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");
  const dataset = datasets.find((item) => item.name === selected) ?? datasets[0];
  const visibleDatasets = datasets.filter((item) => matches(item.name, datasetSearch));
  const visibleFields = (dataset?.fields ?? []).filter((field) => matches(field.name, fieldSearch));

  return (
    <section
      className={className ? `${paneClass} ${className}` : paneClass}
      aria-label="Dataset library"
    >
      <header className={paneHeadClass}>
        <span>Dataset library</span>
        <button type="button" className={iconButtonClass} aria-label="Add dataset">
          <Icon name="plus" />
        </button>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-2">
        <div className={paneClass}>
          <label className={searchClass}>
            <Icon name="search" size={13} />
            <input
              className={inputClass}
              value={datasetSearch}
              onChange={(event) => setDatasetSearch(event.target.value)}
              placeholder="Search datasets"
              aria-label="Search datasets"
            />
          </label>
          <div className={listClass}>
            <span className={captionClass}>All</span>
            {visibleDatasets.map((item) => (
              <button
                key={item.name}
                type="button"
                className={buttonRowClass}
                aria-current={item.name === dataset?.name}
                onClick={() => setSelected(item.name)}
              >
                <Icon name="dataset" size={13} className="text-console-dim" />
                <span className={labelClass}>{item.name}</span>
                {item.name === dataset?.name ? (
                  <Icon name="chevron-right" size={12} className="text-console-dim" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
        <div className={`${paneClass} border-l border-console-divider`}>
          <label className={searchClass}>
            <Icon name="search" size={13} />
            <input
              className={inputClass}
              value={fieldSearch}
              onChange={(event) => setFieldSearch(event.target.value)}
              placeholder={`Search ${dataset?.name ?? "fields"}`}
              aria-label="Search fields"
            />
          </label>
          <div className={listClass}>
            <span className={captionClass}>Quick queries</span>
            {quickQueries.map((query, index) => (
              <button
                key={query.label}
                type="button"
                className={buttonRowClass}
                aria-current={index === 0}
                onClick={onQuickQuery}
              >
                <Icon name={query.icon} size={13} className="text-console-dim" />
                <span className={labelClass}>{query.label}</span>
                {index === 0 ? <Icon name="play" size={10} className="text-console-dim" /> : null}
              </button>
            ))}
            <span className={captionClass}>Fields</span>
            {visibleFields.map((field) => (
              <div key={field.name} className={`${rowClass} cursor-default`}>
                <span
                  className="grid size-3.5 place-items-center rounded-[3px] bg-console-raised text-[9px] text-console-dim"
                  title={field.kind}
                >
                  {kindBadge[field.kind]}
                </span>
                <span className={labelClass}>{field.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
