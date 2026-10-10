import type { ClientError } from "@spoar/client";
import type { ReactNode } from "react";

import type { Read } from "../use-read";

type Props<Value> = {
  title: string;
  read: Read<Value> & { retry: () => void };
  isEmpty: (value: Value) => boolean;
  empty: string;
  skeleton: ReactNode;
  children: (value: Value) => ReactNode;
};

function Failure({ error, onRetry }: { error: ClientError; onRetry: () => void }) {
  return (
    <div className="failure" role="alert">
      <code>{error.code}</code>
      <p>{error.message}</p>
      <button type="button" className="ghost" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

export function ReadFrame<Value>({
  title,
  read,
  isEmpty,
  empty,
  skeleton,
  children,
}: Props<Value>) {
  const value = read.value;
  let body: ReactNode;
  if (read.status === "error" && value === null) {
    body = <Failure error={read.error} onRetry={read.retry} />;
  } else if (value === null) {
    body = skeleton;
  } else if (isEmpty(value)) {
    body = <p className="empty">{empty}</p>;
  } else {
    body = children(value);
  }
  return (
    <section className={`card${read.status === "loading" ? " is-loading" : ""}`}>
      <header className="card-head">
        <h2>{title}</h2>
        {read.status === "error" && value !== null ? (
          <button type="button" className="ghost warn" onClick={read.retry}>
            {read.error.code}, retry
          </button>
        ) : null}
      </header>
      {body}
    </section>
  );
}
