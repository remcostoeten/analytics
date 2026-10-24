import { readConsoleGrant } from "@spoar/shared/console";
import type { Fetcher } from "@spoar/shared/http";
import type { Nullable } from "@spoar/shared/semantic";
import { useEffect, useState } from "react";

import type { WidgetGrant } from "../options";
import { describeKeyUse, describeToken, fetchKeyUsage } from "./status";
import type { KeyUsage } from "./status";

type Props = {
  endpoint: string;
  project: string;
  grant: Nullable<WidgetGrant>;
  fetch?: Fetcher;
};

const tickMs = 30_000;

export function StatusBar({ endpoint, project, grant, fetch }: Props) {
  const [now, setNow] = useState(() => new Date());
  const [usage, setUsage] = useState<Nullable<KeyUsage>>(null);
  const token = grant?.token ?? null;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), tickMs);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!token) return;
    let stale = false;
    void fetchKeyUsage({ endpoint, project, token, fetch }).then((found) => {
      if (!stale) setUsage(found);
    });
    return () => {
      stale = true;
    };
  }, [endpoint, project, token, fetch]);

  const current = readConsoleGrant(now) ?? grant;
  const lines = [
    current ? describeToken(current.expiresAt, now) : "Signed in with your session",
    ...(usage
      ? [describeKeyUse("Public", usage.public, now), describeKeyUse("Secret", usage.secret, now)]
      : []),
  ];

  return (
    <div
      className="flex flex-none flex-wrap items-center gap-x-3 border-b border-console-divider py-1 pr-3 pl-3 font-console-mono text-xs text-console-dim"
      aria-label="Console status"
    >
      <span className="text-console-fg">{project}</span>
      {lines.map((line) => (
        <span key={line} className="truncate">
          {line}
        </span>
      ))}
    </div>
  );
}
