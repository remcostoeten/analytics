import type { Nullable } from "@spoar/shared/semantic";
import { useState } from "react";

import { buttonClass } from "../parts/toolbar";
import type { ViewContext } from "../widget/view";
import { AnnotateForm } from "./annotate-form";
import { VisitsSwitch } from "./visits-switch";

type Props = { context: ViewContext };

export function Actions({ context }: Props) {
  const [annotating, setAnnotating] = useState(false);
  const [added, setAdded] = useState<Nullable<string>>(null);

  return (
    <>
      <div
        className="ml-auto flex items-center gap-2 font-console-sans"
        data-project={context.project}
      >
        {added ? (
          <span className="truncate text-console-fg" role="status">
            Added "{added}"
          </span>
        ) : null}
        {context.host ? <VisitsSwitch host={context.host} /> : null}
        <button
          type="button"
          className={buttonClass}
          aria-expanded={annotating}
          onClick={() => {
            setAdded(null);
            setAnnotating((open) => !open);
          }}
        >
          Annotate
        </button>
      </div>
      {annotating ? (
        <AnnotateForm
          context={context}
          onCancel={() => setAnnotating(false)}
          onDone={(title) => {
            setAnnotating(false);
            setAdded(title);
          }}
        />
      ) : null}
    </>
  );
}
