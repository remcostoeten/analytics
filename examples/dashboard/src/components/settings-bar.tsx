import { useState } from "react";

import type { Settings } from "../settings";

type Props = {
  settings: Settings;
  onChange: (settings: Settings) => void;
};

const fields: {
  key: keyof Settings;
  label: string;
  placeholder: string;
  hint: string;
  secret: boolean;
}[] = [
  {
    key: "endpoint",
    label: "API",
    placeholder: "https://api.analytics.remcostoeten.nl",
    hint: "Where the Spoar API runs.",
    secret: false,
  },
  {
    key: "project",
    label: "Project",
    placeholder: "remcostoeten.nl",
    hint: "The project id to read.",
    secret: false,
  },
  {
    key: "token",
    label: "Read token",
    placeholder: "at_live_...",
    hint: "Only for private projects.",
    secret: true,
  },
  {
    key: "publicKey",
    label: "Public key",
    placeholder: "pk_live_...",
    hint: "Lets this page track itself.",
    secret: true,
  },
];

function host(endpoint: string) {
  try {
    return new URL(endpoint).host;
  } catch {
    return endpoint;
  }
}

export function SettingsBar({ settings, onChange }: Props) {
  const [open, setOpen] = useState(settings.project === "");
  return (
    <header className="topbar">
      <div className="topbar-row">
        <div className="brand">
          <strong>Example dashboard</strong>
          <span>@spoar/client</span>
        </div>
        <button
          type="button"
          className="connection"
          aria-expanded={open}
          aria-controls="connection-panel"
          onClick={() => setOpen((value) => !value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        >
          <span className="connection-project">{settings.project || "No project"}</span>
          <span className="connection-host">{host(settings.endpoint)}</span>
          <span className={`chevron${open ? " open" : ""}`} aria-hidden="true">
            ▾
          </span>
        </button>
      </div>
      {open ? (
        <form
          id="connection-panel"
          className="settings"
          onSubmit={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        >
          {fields.map((field) => (
            <label key={field.key} className="field" htmlFor={`setting-${field.key}`}>
              <span className="field-label">{field.label}</span>
              <input
                id={`setting-${field.key}`}
                type={field.secret ? "password" : "text"}
                autoComplete="off"
                spellCheck={false}
                placeholder={field.placeholder}
                value={settings[field.key]}
                onChange={(event) =>
                  onChange({ ...settings, [field.key]: event.target.value.trim() })
                }
              />
              <span className="field-hint">{field.hint}</span>
            </label>
          ))}
        </form>
      ) : null}
    </header>
  );
}
