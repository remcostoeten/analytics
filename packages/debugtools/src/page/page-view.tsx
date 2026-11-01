import type { ViewContext } from "../widget/view";

type Props = { context: ViewContext };

export function PageView({ context }: Props) {
  return <div className="p-3 font-console-mono text-xs text-console-dim">{context.project}</div>;
}
