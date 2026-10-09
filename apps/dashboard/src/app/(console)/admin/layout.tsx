import type { ReactNode } from "react";

type Props = { children: ReactNode };

export default function Layout({ children }: Props) {
  return <div className="mx-auto grid max-w-4xl gap-6">{children}</div>;
}
