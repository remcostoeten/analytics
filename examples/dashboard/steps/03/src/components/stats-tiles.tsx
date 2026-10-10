import type { ProjectScope, StatsResponse } from "@spoar/client";

import { formatChange, formatCount, formatDuration, formatPercent } from "../format";
import { useRead } from "../use-read";
import { ReadFrame } from "./read-frame";

type Props = { scope: ProjectScope; scopeKey: string };

type Tile = {
  label: string;
  metric: keyof StatsResponse["data"];
  format: (value: number) => string;
  invert?: boolean;
};

const tiles: Tile[] = [
  { label: "Visitors", metric: "visitors", format: formatCount },
  { label: "Sessions", metric: "sessions", format: formatCount },
  { label: "Pageviews", metric: "pageviews", format: formatCount },
  { label: "Bounce rate", metric: "bounceRate", format: formatPercent, invert: true },
  { label: "Session duration", metric: "sessionDurationMs", format: formatDuration },
];

function direction(change: number | null, invert: boolean | undefined) {
  if (change === null || change === 0) return "flat";
  const up = change > 0;
  return up !== Boolean(invert) ? "good" : "bad";
}

export function StatsTiles({ scope, scopeKey }: Props) {
  const stats = useRead(() => scope.stats(), [scopeKey]);
  return (
    <ReadFrame
      title="Overview"
      read={stats}
      isEmpty={(value) => value.data.visitors.value === 0 && value.data.pageviews.value === 0}
      empty="No traffic in this range."
      skeleton={
        <dl className="tiles">
          {tiles.map((tile) => (
            <div key={tile.metric} className="tile">
              <dt>{tile.label}</dt>
              <dd className="skeleton">0</dd>
            </div>
          ))}
        </dl>
      }
    >
      {(value) => (
        <dl className="tiles">
          {tiles.map((tile) => {
            const compared = value.data[tile.metric];
            return (
              <div key={tile.metric} className="tile">
                <dt>{tile.label}</dt>
                <dd>{tile.format(compared.value)}</dd>
                <span className={`change ${direction(compared.change, tile.invert)}`}>
                  {formatChange(compared.change)}
                </span>
              </div>
            );
          })}
        </dl>
      )}
    </ReadFrame>
  );
}
