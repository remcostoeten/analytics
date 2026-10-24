import type { IngestTotals } from "@spoar/contract";

import { Tip } from "@/shared/ui/tip";
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
        <Stat
          label="Accepted"
          value={ingest.accepted}
          tip="Visits that arrived and were saved. This is the number you want to see growing."
        />
        <Stat
          label="Duplicates"
          value={ingest.duplicates}
          tip="Visits that were sent more than once. Only one copy is kept, so nothing is double counted."
        />
        <Stat
          label="Rejected"
          value={ingest.rejected}
          tip="Visits we refused. Usually the site address is not in the allowed origins, or a key is wrong."
        />
        <Stat
          label="Rate limited"
          value={ingest.rateLimited}
          tip="Visits turned away because too many arrived too quickly from one source. A few is normal, many can mean a bot."
        />
      </dl>
    </div>
  );
}

function Stat({ label, value, tip }: { label: string; value: number; tip: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="caps text-muted flex items-center gap-1">
        {label}
        <Tip label={`About ${label}`}>{tip}</Tip>
      </dt>
      <dd className="font-mono tabular-nums">{value.toLocaleString()}</dd>
    </div>
  );
}
