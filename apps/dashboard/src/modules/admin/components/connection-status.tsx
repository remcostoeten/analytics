import type { IngestTotals } from "@spoar/contract";

import { connectionOf, type ConnectionState } from "../connection";

type Props = { ingest: IngestTotals };

const copy: Record<ConnectionState, { label: string; hint: string; tone: string }> = {
  connected: {
    label: "Connected",
    hint: "Events are arriving and being stored.",
    tone: "text-ok",
  },
  rejected: {
    label: "Events refused",
    hint: "The site sends events but the API rejects them. Check the allowed origins and the proxy secret.",
    tone: "text-err",
  },
  waiting: {
    label: "Waiting for first event",
    hint: "No events in the last 24 hours. Add the snippet and load a page on the site.",
    tone: "text-muted",
  },
};

export function ConnectionStatus({ ingest }: Props) {
  const state = connectionOf(ingest);
  const { label, hint, tone } = copy[state];
  return (
    <div className="card grid gap-3 p-4">
      <div className="flex items-center justify-between gap-4">
        <span className={`text-sm font-medium ${tone}`}>{label}</span>
        <span className="caps text-muted">Last 24 hours</span>
      </div>
      <p className="text-muted text-sm">{hint}</p>
      <dl className="grid grid-cols-4 gap-2 text-sm">
        <Stat label="Accepted" value={ingest.accepted} />
        <Stat label="Duplicates" value={ingest.duplicates} />
        <Stat label="Rejected" value={ingest.rejected} />
        <Stat label="Rate limited" value={ingest.rateLimited} />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-0.5">
      <dt className="caps text-muted">{label}</dt>
      <dd className="font-mono tabular-nums">{value.toLocaleString()}</dd>
    </div>
  );
}
