import { useState } from "react";

import { Icon } from "../icons";
import type { Dataset, FieldKind, QuickQuery } from "../types";

const kindBadge: { [Kind in FieldKind]: string } = {
  string: "S",
  number: "N",
  boolean: "B",
  time: "T",
};

function matches(value: string, search: string) {
  return value.toLowerCase().includes(search.trim().toLowerCase());
}

type Props = {
  datasets: Dataset[];
  quickQueries: QuickQuery[];
  onQuickQuery: () => void;
};

export function Library({ datasets, quickQueries, onQuickQuery }: Props) {
  const [selected, setSelected] = useState(datasets[0]?.name ?? "");
  const [datasetSearch, setDatasetSearch] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");
  const dataset = datasets.find((item) => item.name === selected) ?? datasets[0];
  const visibleDatasets = datasets.filter((item) => matches(item.name, datasetSearch));
  const visibleFields = (dataset?.fields ?? []).filter((field) => matches(field.name, fieldSearch));

  return (
    <section className="spc-library" aria-label="Dataset library">
      <header className="spc-pane-head">
        <span>Dataset library</span>
        <button type="button" className="spc-icon-button" aria-label="Add dataset">
          <Icon name="plus" />
        </button>
      </header>
      <div className="spc-columns">
        <div className="spc-column">
          <label className="spc-search">
            <Icon name="search" size={13} />
            <input
              value={datasetSearch}
              onChange={(event) => setDatasetSearch(event.target.value)}
              placeholder="Search datasets"
              aria-label="Search datasets"
            />
          </label>
          <div className="spc-list spc-fade">
            <span className="spc-caption">All</span>
            {visibleDatasets.map((item) => (
              <button
                key={item.name}
                type="button"
                className="spc-row"
                aria-current={item.name === dataset?.name}
                onClick={() => setSelected(item.name)}
              >
                <Icon name="dataset" size={13} />
                <span className="spc-row-label">{item.name}</span>
                {item.name === dataset?.name ? <Icon name="chevron-right" size={12} /> : null}
              </button>
            ))}
          </div>
        </div>
        <div className="spc-column">
          <label className="spc-search">
            <Icon name="search" size={13} />
            <input
              value={fieldSearch}
              onChange={(event) => setFieldSearch(event.target.value)}
              placeholder={`Search ${dataset?.name ?? "fields"}`}
              aria-label="Search fields"
            />
          </label>
          <div className="spc-list spc-fade">
            <span className="spc-caption">Quick queries</span>
            {quickQueries.map((query, index) => (
              <button
                key={query.label}
                type="button"
                className="spc-row"
                aria-current={index === 0}
                onClick={onQuickQuery}
              >
                <Icon name={query.icon} size={13} />
                <span className="spc-row-label">{query.label}</span>
                {index === 0 ? <Icon name="play" size={10} /> : null}
              </button>
            ))}
            <span className="spc-caption">Fields</span>
            {visibleFields.map((field) => (
              <div key={field.name} className="spc-row spc-field">
                <span className="spc-badge" title={field.kind}>
                  {kindBadge[field.kind]}
                </span>
                <span className="spc-row-label">{field.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
