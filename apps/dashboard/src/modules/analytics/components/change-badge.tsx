import { TrendIcon } from "@/shared/ui/icons";

import { formatChange } from "../format";

type Props = { change: number | null; lowerIsBetter: boolean };

export function ChangeBadge({ change, lowerIsBetter }: Props) {
  const text = formatChange(change);
  if (text === null) return null;
  const rising = (change ?? 0) >= 0;
  const good = lowerIsBetter ? !rising : rising;
  return (
    <span
      className={`flex items-center gap-0.5 text-xs ${good ? "text-ok" : "text-err"}`}
      title="Compared with the previous period"
    >
      <TrendIcon down={!rising} className="size-3" />
      {text}
    </span>
  );
}
