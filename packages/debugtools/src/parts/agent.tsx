import { highlightLine, parseEmphasis } from "../highlight";
import { Icon } from "../icons";
import type { IconName } from "../icons";
import type { AgentScript, AgentStep } from "../types";

const panelActions: IconName[] = ["rows", "builder", "code", "user", "agent"];

function Rich({ text }: { text: string }) {
  return (
    <>
      {parseEmphasis(text).map((part, index) =>
        part.strong ? (
          <strong key={index}>{part.text}</strong>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

function Step({ step }: { step: AgentStep }) {
  if (step.kind === "status") {
    return (
      <p className="spc-step spc-step-status">
        <span className="spc-chevron">❯</span>
        <Rich text={step.text} />
      </p>
    );
  }
  if (step.kind === "bullet") {
    return (
      <p className="spc-step spc-step-bullet">
        <span aria-hidden="true">•</span>
        <span>
          <Rich text={step.text} />
        </span>
      </p>
    );
  }
  return (
    <p className="spc-step">
      <Rich text={step.text} />
    </p>
  );
}

type RecentProps = {
  queries: string[][];
  keywords: ReadonlySet<string>;
};

function RecentQueries({ queries, keywords }: RecentProps) {
  return (
    <div className="spc-recent spc-fade" aria-hidden="true">
      {queries.map((query, index) => (
        <div key={index} className="spc-recent-item">
          <Icon name="code" size={12} />
          <div className="spc-recent-code">
            {query.map((line, row) => (
              <div key={row} className="spc-recent-line">
                <span className="spc-recent-number">{row + 1}</span>
                <span>
                  {highlightLine(line, keywords).map((token, position) => (
                    <span key={position} className={`spc-token-${token.kind}`}>
                      {token.text}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <Icon name="more" size={12} />
        </div>
      ))}
    </div>
  );
}

type AgentProps = {
  script: AgentScript;
  recentQueries: string[][];
  keywords: ReadonlySet<string>;
  promptChars: number;
  submitted: boolean;
  steps: number;
  followUpChars: number;
};

export function Agent({
  script,
  recentQueries,
  keywords,
  promptChars,
  submitted,
  steps,
  followUpChars,
}: AgentProps) {
  const input = submitted
    ? script.followUp.slice(0, followUpChars)
    : script.prompt.slice(0, promptChars);

  return (
    <section className="spc-side" aria-label="Recent queries and agent">
      <header className="spc-pane-head">
        <span className="spc-select">
          Recent queries
          <Icon name="chevron-down" size={12} />
        </span>
        <span className="spc-actions" aria-hidden="true">
          {panelActions.map((name, index) => (
            <span key={name} className="spc-action" data-active={index === panelActions.length - 1}>
              <Icon name={name} size={13} />
            </span>
          ))}
        </span>
      </header>
      <RecentQueries queries={recentQueries} keywords={keywords} />
      <div className="spc-agent" role="log" aria-label={script.name} aria-live="polite">
        <div className="spc-agent-head">
          <span className="spc-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="spc-agent-name">› {script.name}</span>
        </div>
        <div className="spc-transcript">
          <div className="spc-transcript-body">
            {submitted ? <p className="spc-prompt">&gt; {script.prompt}</p> : null}
            {submitted && steps === 0 ? <p className="spc-step spc-thinking">Thinking</p> : null}
            {script.steps.slice(0, steps).map((step, index) => (
              <Step key={index} step={step} />
            ))}
          </div>
        </div>
        <div className="spc-input">
          &gt; {input}
          <span className="spc-block-caret" />
        </div>
        <div className="spc-agent-foot">{script.footer}</div>
      </div>
    </section>
  );
}
