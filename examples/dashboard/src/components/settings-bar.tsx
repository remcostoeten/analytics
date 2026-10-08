import type { Settings } from "../settings";

type Props = {
  settings: Settings;
  onChange: (settings: Settings) => void;
};

const fields: { key: keyof Settings; label: string; placeholder: string; secret: boolean }[] = [
  {
    key: "endpoint",
    label: "API",
    placeholder: "https://api.analytics.remcostoeten.nl",
    secret: false,
  },
  { key: "project", label: "Project", placeholder: "remcostoeten.nl", secret: false },
  {
    key: "token",
    label: "Read token",
    placeholder: "at_live_... (private projects)",
    secret: true,
  },
  {
    key: "publicKey",
    label: "Public key",
    placeholder: "pk_live_... (to track this page)",
    secret: true,
  },
];

export function SettingsBar({ settings, onChange }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <strong>Example dashboard</strong>
        <span>@spoar/client</span>
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
