import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

import { vitalShare, vitalText, vitalTone } from "../../../ui/format";
import type { Vital } from "../../../ui/format";

type Props = {
  vital: Vital;
  value: Nullable<number>;
};

export function VitalBar({ vital, value }: Props) {
  return (
    <span>
      <span className={`bar ${vitalTone(vital, value)}`} aria-hidden="true">
        <i style={{ transform: `scaleX(${vitalShare(vital, value)})` }} />
      </span>
      <span className="m">{vitalText(vital, value)}</span>
    </span>
  );
}
