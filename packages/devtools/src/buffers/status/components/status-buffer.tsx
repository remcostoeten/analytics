import { noop } from "@spoar/shared/noop";
import { useEffect } from "react";

import type { JsonValue, Share } from "../../../client/types";
import type { BufferProps } from "../../../panel/types";
import { useStore } from "../../../store/create-store";
import { clock, count, duration, percent } from "../../../ui/format";
import { shareText, sparkHeights } from "../utils/shares";

function Shares({ title, rows }: { title: string; rows: Share[] }) {
  return (
    <div className="scard">
      <h4>{title}</h4>
      <dl className="kv">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt>{row.label}</dt>
            <dd>
              <b>{shareText(row)}</b>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Inline({ value }: { value: JsonValue }) {
  if (value === null) return <span className="j-null">null</span>;
  if (typeof value === "string") return <span className="j-string">{JSON.stringify(value)}</span>;
  if (typeof value === "number") return <span className="j-number">{value}</span>;
  if (typeof value === "boolean") return <span className="j-boolean">{String(value)}</span>;
  if (Array.isArray(value)) return <span className="j-string">{JSON.stringify(value)}</span>;
  const entries = Object.entries(value);
  return (
    <>
      <span className="j-punct">{"{ "}</span>
      {entries.map(([key, item], index) => (
        <span key={key}>
          <span className="j-key">{key}</span>
          <span className="j-punct">: </span>
          <Inline value={item} />
          {index < entries.length - 1 ? <span className="j-punct">, </span> : null}
        </span>
      ))}
      <span className="j-punct">{" }"}</span>
    </>
  );
}

export function StatusBuffer({ runtime, register }: BufferProps) {
  const live = useStore(runtime.live);
  const overview = live.overview;

  useEffect(() => {
    register({ move: noop, activate: noop, menu: noop });
  }, []);

  if (!overview) return <div className="empty">loading overview</div>;

  const config: JsonValue = {
    project: runtime.bootstrap.project.id,
    release: runtime.bootstrap.project.release,
    endpoint: runtime.options.endpoint,
    publicKey: runtime.bootstrap.publicKey,
    ...runtime.bootstrap.features,
  };

  return (
    <div className="status">
      <div className="scard">
        <h4>Online</h4>
        <div className="big">
          {overview.online}
          <small>visitors, 5 min window</small>
        </div>
        <div className="spark" aria-label="Views per minute">
          {sparkHeights(overview.viewsPerMinute).map((height, index, all) => (
            <i
              key={index}
              className={index === all.length - 1 ? "hi" : undefined}
              style={{ transform: `scaleY(${Math.max(0.08, height)})` }}
            />
          ))}
        </div>
      </div>
      <div className="scard">
        <h4>Today</h4>
        <div className="big">
          {count(overview.today.visitors)}
          <small>visitors · {count(overview.today.pageviews)} views</small>
        </div>
        <div className="m">
          bounce {percent(overview.today.bounceRate)}, avg session{" "}
          {duration(overview.today.sessionMs)}
        </div>
      </div>
      <div className="scard">
        <h4>Ingest</h4>
        <div className="big">
          {percent(overview.ingest.ratio)}
          <small>accepted</small>
        </div>
        <div className="m">
          {count(overview.ingest.rejected)} rejected, {count(overview.ingest.duplicates)} duplicates
        </div>
      </div>
      <div className="scard">
        <h4>Bots</h4>
        <div className="big">
          {percent(overview.bots.share)}
          <small>of sessions</small>
        </div>
        <div className="m">
          {overview.bots.reasons.map((reason) => `${reason.label} ${reason.value}`).join(", ") ||
            "no signals"}
        </div>
      </div>
      <Shares title="Top pages" rows={overview.topPages} />
      <Shares title="Referrers" rows={overview.referrers} />
      <Shares title="Countries" rows={overview.countries} />
      <div className="scard">
        <h4>Release</h4>
        {overview.release ? (
          <>
            <div className="big release">{overview.release.name}</div>
            <div className="m">
              deployed {clock(overview.release.deployedAt)}, {overview.release.newIssues} new error
              groups since
            </div>
          </>
        ) : (
          <div className="m">no release reported</div>
        )}
      </div>
      <div className="scard wide">
        <h4>Project as resolved</h4>
        <div className="pre">
          <Inline value={config} />
        </div>
      </div>
    </div>
  );
}
