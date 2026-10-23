type Props = {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function SwitchRow({ id, label, hint, checked, onChange }: Props) {
  return (
    <label htmlFor={id} className="switch-row">
      <span className="grid gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted text-xs">{hint}</span>
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-checked={checked}
        className="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
