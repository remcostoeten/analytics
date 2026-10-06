import { useHighlight } from "../highlight";
import type { Json } from "../json";

type Props = {
  tone: "ok" | "error" | "idle";
  badge: string;
  meta: string[];
  body: Json | string;
};

export function ResultView({ tone, badge, meta, body }: Props) {
  const isText = typeof body === "string";
  const printed = isText ? body : JSON.stringify(body, null, 2);
  const html = useHighlight(isText ? "" : printed, "json");
  return (
    <section className={`result ${tone}`} aria-live="polite">
      <div className="result-head">
        <span className="result-title">Response</span>
        <span className={`pill ${tone}`}>{badge}</span>
        {meta.filter(Boolean).map((item) => (
          <span key={item} className="meta">
            {item}
          </span>
        ))}
      </div>
      {html && !isText ? (
        <div className="highlighted" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre>
          <code>{printed}</code>
        </pre>
      )}
    </section>
  );
}
