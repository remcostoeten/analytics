import type { ReactNode } from "react";

type Props = {
  tip: string;
  children: ReactNode;
};

export function TermTip({ tip, children }: Props) {
  return (
    <span className="term-tip" tabIndex={0}>
      {children}
      <span role="tooltip" className="term-tip-bubble">
        {tip}
      </span>
    </span>
  );
}
