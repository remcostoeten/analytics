import type { ReactNode } from "react";
import { Suspense } from "react";

import { ProjectConsoleSlot } from "@/modules/console/components/project-console-slot";

type Props = { children: ReactNode };

export default function Layout({ children }: Props) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <ProjectConsoleSlot />
      </Suspense>
    </>
  );
}
