import type { ViewContext } from "../widget/view";

type Props = { context: ViewContext };

export function EventsView({ context }: Props) {
  return (
    <div className="p-3 font-console-mono text-xs text-console-dim">
      {context.host ? "Waiting for events" : "No SDK on this page"}
    </div>
  );
}
