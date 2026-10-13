import { parseEmphasis } from "../highlight";
import { Icon } from "../icons";
import type { IconName } from "../icons";
import type { AgentScript, AgentStep } from "../types";
import { CodeLine } from "./code-line";
import { hideScrollbarClass, paneClass, paneHeadClass } from "./pane";

const recentActions: IconName[] = ["rows", "builder", "code", "user"];
const stepClass =
  "animate-console-rise motion-reduce:animate-none [&_strong]:font-medium [&_strong]:text-console-fg";

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
      <p className={`${stepClass} flex gap-2`}>
        <span className="text-console-accent">❯</span>
        <Rich text={step.text} />
      </p>
    );
  }
  if (step.kind === "bullet") {
    return (
      <p className={`${stepClass} flex gap-2`}>
        <span aria-hidden="true">•</span>
        <span>
          <Rich text={step.text} />
        </span>
      </p>
    );
  }
  return (
    <p className={stepClass}>
      <Rich text={step.text} />
    </p>
  );
}

type RecentProps = {
  queries: string[][];
  keywords: ReadonlySet<string>;
  behind: boolean;
  onPick?: (query: string[]) => void;
};

export function RecentQueries({ queries, keywords, behind, onPick }: RecentProps) {
  return (
    <div
      className={`spc-fade min-h-0 flex-1 px-3 py-2.5 font-console-mono text-[11.5px] ${onPick ? `overflow-y-auto ${hideScrollbarClass}` : "overflow-hidden"} ${behind ? "opacity-55" : ""}`}
      aria-hidden={behind}
    >
      {queries.map((query, index) => (
        <div
          key={index}
          className={`relative flex items-start gap-2.5 border-b border-console-divider pt-2 pb-3 text-console-dim ${onPick ? "hover:bg-console-hover" : ""}`}
        >
          {onPick ? (
            <button
              type="button"
              className="absolute inset-0"
              aria-label={`Load query ${index + 1}`}
              onClick={() => onPick(query)}
            />
          ) : null}
          <Icon name="code" size={12} />
          <div className="min-w-0 flex-1 overflow-hidden whitespace-pre">
            {query.map((line, row) => (
              <div key={row} className="flex gap-2.5 leading-[19px]">
                <span className="w-2.5 text-right text-console-faint">{row + 1}</span>
                <span>
                  <CodeLine line={line} keywords={keywords} />
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
  promptChars: number;
  submitted: boolean;
  steps: number;
  followUpChars: number;
  alone: boolean;
};

function Agent({ script, promptChars, submitted, steps, followUpChars, alone }: AgentProps) {
  const input = submitted
    ? script.followUp.slice(0, followUpChars)
    : script.prompt.slice(0, promptChars);

  return (
    <div
      className={`absolute top-11.5 right-3 bottom-3 flex flex-col overflow-hidden rounded-lg border border-console-line bg-console-surface font-console-mono text-xs leading-[1.6] shadow-[0_24px_48px_-12px_var(--spc-shadow)] ${alone ? "left-3" : "left-8 @max-[860px]:left-3"}`}
      role="log"
      aria-label={script.name}
      aria-live="polite"
    >
      <div className="flex h-8 flex-none items-center gap-3 border-b border-console-divider px-3 text-console-dim">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-[9px] rounded-full bg-console-faint" />
          <span className="size-[9px] rounded-full bg-console-faint" />
          <span className="size-[9px] rounded-full bg-console-faint" />
        </span>
        <span>› {script.name}</span>
      </div>
      <div className={`flex min-h-0 flex-1 flex-col-reverse overflow-y-auto ${hideScrollbarClass}`}>
        <div className="flex flex-[1_0_auto] flex-col gap-1.5 px-3 py-2.5 text-console-muted">
          {submitted ? (
            <p className="-mx-1 mb-1 rounded-[3px] bg-console-raised px-2 py-1 text-console-fg">
              &gt; {script.prompt}
            </p>
          ) : null}
          {submitted && steps === 0 ? <p className="spc-thinking">Thinking</p> : null}
          {script.steps.slice(0, steps).map((step, index) => (
            <Step key={index} step={step} />
          ))}
        </div>
      </div>
      <div className="flex-none border-t border-console-divider px-3 py-2 whitespace-pre-wrap text-console-fg">
        &gt; {input}
        <span className="ml-px inline-block h-3.5 w-[7px] animate-console-blink bg-console-fg align-[-2px] motion-reduce:animate-none" />
      </div>
      <div className="flex-none truncate border-t border-console-divider px-3 py-[7px] text-[11.5px] text-console-dim">
        {script.footer}
      </div>
    </div>
  );
}

type SideProps = {
  recent: boolean;
  agent: boolean;
  script: AgentScript;
  recentQueries: string[][];
  keywords: ReadonlySet<string>;
  promptChars: number;
  submitted: boolean;
  steps: number;
  followUpChars: number;
};

export function Side({ recent, agent, script, recentQueries, keywords, ...playback }: SideProps) {
  const actions: IconName[] = agent ? [...recentActions, "agent"] : recentActions;

  return (
    <section className={paneClass} aria-label={recent ? "Recent queries" : script.name}>
      <header className={paneHeadClass}>
        <span className="inline-flex items-center gap-1.5 text-console-muted">
          {recent ? "Recent queries" : script.name}
          {recent ? <Icon name="chevron-down" size={12} /> : null}
        </span>
        <span className="flex gap-0.5 text-console-dim" aria-hidden="true">
          {actions.map((name) => (
            <span
              key={name}
              className="grid size-5.5 place-items-center rounded-sm data-[active=true]:bg-console-raised data-[active=true]:text-console-fg"
              data-active={agent && name === "agent"}
            >
              <Icon name={name} size={13} />
            </span>
          ))}
        </span>
      </header>
      {recent ? <RecentQueries queries={recentQueries} keywords={keywords} behind={agent} /> : null}
      {agent ? <Agent script={script} alone={!recent} {...playback} /> : null}
    </section>
  );
}
