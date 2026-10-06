import { useState } from "react";
import type { SdkMethod } from "../sdk-catalog";
import type { Route, RouteGroup } from "../spec";

type Props = {
  groups: RouteGroup[];
  methods: SdkMethod[];
  selected: string;
  query: string;
  onQuery: (query: string) => void;
  onSelect: (id: string) => void;
};

const tasks = [
  { name: "Track", tags: ["Ingest"] },
  {
    name: "Read",
    tags: ["Reads", "Visitor-level reads", "All projects", "Speed", "Issues", "SQL"],
  },
  { name: "Manage", tags: ["Projects", "Tokens", "Annotations", "Alerts", "Sign-in"] },
  { name: "Operate", tags: ["System", "Jobs", "Dev widget"] },
];

function matches(query: string, ...values: string[]) {
  const needle = query.trim().toLowerCase();
  return needle === "" || values.some((value) => value.toLowerCase().includes(needle));
}

function routeMatches(query: string, route: Route) {
  return matches(query, route.path, route.summary, route.method, route.tag);
}

export function Sidebar({ groups, methods, selected, query, onQuery, onSelect }: Props) {
  const [open, setOpen] = useState<string[]>([]);
  const searching = query.trim() !== "";
  const known = tasks.flatMap((task) => task.tags);
  const sections = [
    ...tasks,
    { name: "Other", tags: groups.map((group) => group.tag).filter((tag) => !known.includes(tag)) },
  ]
    .map((task) => ({
      name: task.name,
      groups: task.tags
        .map((tag) => groups.find((group) => group.tag === tag))
        .filter((group) => group !== undefined)
        .map((group) => ({
          key: group.tag,
          items: group.routes.filter((route) => routeMatches(query, route)),
        }))
        .filter((group) => group.items.length > 0),
    }))
    .filter((section) => section.groups.length > 0);
  const entries = [...new Set(methods.map((method) => method.entry))]
    .map((entry) => ({
      key: entry,
      items: methods.filter(
        (method) => method.entry === entry && matches(query, method.name, entry),
      ),
    }))
    .filter((group) => group.items.length > 0);

  function isOpen(key: string, ids: string[]) {
    return searching || open.includes(key) || ids.includes(selected);
  }

  function toggle(key: string, ids: string[]) {
    const shown = isOpen(key, ids);
    setOpen((current) => (shown ? current.filter((item) => item !== key) : [...current, key]));
  }

  return (
    <nav className="sidebar" aria-label="Routes and SDK methods">
      <div className="sidebar-top">
        <input
          id="search"
          className="search"
          type="search"
          placeholder="Filter by path, name or tag"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
        <button
          type="button"
          className={selected === "overview" ? "item overview active" : "item overview"}
          onClick={() => onSelect("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          className={selected === "walkthrough" ? "item overview active" : "item overview"}
          onClick={() => onSelect("walkthrough")}
        >
          Walkthrough
        </button>
      </div>

      {sections.map((section) => (
        <div key={section.name} className="section">
          <h2 className="section-title">{section.name}</h2>
          {section.groups.map((group) => {
            const ids = group.items.map((route) => route.id);
            const shown = isOpen(group.key, ids);
            return (
              <div key={group.key} className="group">
                <button
                  type="button"
                  className="group-toggle"
                  aria-expanded={shown}
                  onClick={() => toggle(group.key, ids)}
                >
                  <span className="caret" aria-hidden="true" />
                  {group.key}
                  <span className="count">{group.items.length}</span>
                </button>
                {shown ? (
                  <ul>
                    {group.items.map((route) => (
                      <li key={route.id}>
                        <button
                          type="button"
                          className={selected === route.id ? "item active" : "item"}
                          onClick={() => onSelect(route.id)}
                        >
                          <span className="item-title">{route.summary}</span>
                          <span className="item-sub">
                            <span className={`badge small ${route.method.toLowerCase()}`}>
                              {route.method}
                            </span>
                            <span className="item-path">{route.path.replace("/v2", "")}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}

      {entries.length > 0 ? (
        <div className="section">
          <h2 className="section-title">SDK</h2>
          {entries.map((group) => {
            const ids = group.items.map((method) => method.id);
            const shown = isOpen(group.key, ids);
            return (
              <div key={group.key} className="group">
                <button
                  type="button"
                  className="group-toggle mono"
                  aria-expanded={shown}
                  onClick={() => toggle(group.key, ids)}
                >
                  <span className="caret" aria-hidden="true" />
                  {group.key.replace("@spoar/", "")}
                  <span className="count">{group.items.length}</span>
                </button>
                {shown ? (
                  <ul>
                    {group.items.map((method) => (
                      <li key={method.id}>
                        <button
                          type="button"
                          className={selected === method.id ? "item active" : "item"}
                          onClick={() => onSelect(method.id)}
                        >
                          <span className="item-title mono">{method.name}</span>
                          <span className="item-sub">
                            <span
                              className={method.run ? "badge small run" : "badge small code-only"}
                            >
                              {method.run ? "Run" : "Code"}
                            </span>
                            <span className="item-path">{method.description}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </nav>
  );
}
