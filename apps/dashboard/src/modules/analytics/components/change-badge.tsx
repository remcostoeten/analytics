import { formatChange } from "../format";

type Props = { change: number | null; lowerIsBetter: boolean };

const flatBelow = 0.0005;

function tone(change: number, lowerIsBetter: boolean) {
  if (Math.abs(change) < flatBelow) return "flat";
  const rising = change > 0;
  return lowerIsBetter !== rising ? "good" : "bad";
}

function Chevron({ change }: { change: number }) {
  if (Math.abs(change) < flatBelow) {
    return (
      <svg viewBox="0 0 8 8" className="delta-mark" aria-hidden="true">
        <path d="M1.5 4h5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 8 8" className="delta-mark" aria-hidden="true">
      <path d={change > 0 ? "M1.5 5.25 4 2.75l2.5 2.5" : "M1.5 2.75 4 5.25l2.5-2.5"} />
    </svg>
  );
}

export function ChangeBadge({ change, lowerIsBetter }: Props) {
  const text = formatChange(change);
  if (text === null || change === null) return null;
  const direction = Math.abs(change) < flatBelow ? "Unchanged" : change > 0 ? "Up" : "Down";
  return (
    <span
      className="delta"
      data-tone={tone(change, lowerIsBetter)}
      title="Compared with the previous period"
    >
      <Chevron change={change} />
      <span className="sr-only">{direction} </span>
      {text}
    </span>
  );
}
