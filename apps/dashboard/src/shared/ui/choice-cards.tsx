type Choice<Value extends string> = { value: Value; label: string; hint: string };

type Props<Value extends string> = {
  name: string;
  label: string;
  value: Value;
  choices: Choice<Value>[];
  onChange: (value: Value) => void;
};

export function ChoiceCards<Value extends string>({
  name,
  label,
  value,
  choices,
  onChange,
}: Props<Value>) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="caps text-muted mb-1.5">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
        {choices.map((choice) => (
          <label key={choice.value} className="choice-card">
            <input
              type="radio"
              name={name}
              className="choice-radio"
              value={choice.value}
              checked={choice.value === value}
              onChange={() => onChange(choice.value)}
            />
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">{choice.label}</span>
              <span className="text-muted text-xs">{choice.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
