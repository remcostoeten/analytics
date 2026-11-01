import type { ViewContext } from "../widget/view";

type Props = { context: ViewContext };

export function Actions({ context }: Props) {
  return <div className="ml-auto flex items-center gap-2" data-project={context.project} />;
}
