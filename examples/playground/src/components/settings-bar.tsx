import type { Settings } from "../request";

type Props = {
  settings: Settings;
  version: string;
  onChange: (settings: Settings) => void;
};

const fields: { key: keyof Settings; label: string; placeholder: string; secret: boolean }[] = [
  {
    key: "base",
    label: "API",
    placeholder: "https://api.analytics.remcostoeten.nl",
    secret: false,
  },
  { key: "project", label: "Project", placeholder: "remcostoeten.nl", secret: false },
  { key: "projectKey", label: "Project key", placeholder: "pk_live_...", secret: true },
  { key: "token", label: "API token", placeholder: "at_live_...", secret: true },
];

export function SettingsBar({ settings, version, onChange }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <strong>Spoar playground</strong>
        <span>{version ? `API ${version}` : "Loading spec"}</span>
      </div>
      <form className="settings" onSubmit={(event) => event.preventDefault()}>
        {fields.map((field) => (
          <label key={field.key} htmlFor={`setting-${field.key}`}>
            <span>{field.label}</span>
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
          </label>
        ))}
      </form>
    </header>
  );
}
