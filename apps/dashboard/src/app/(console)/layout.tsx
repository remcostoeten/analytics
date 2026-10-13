import type { ReactNode } from "react";
import { Suspense } from "react";

import { SidebarSlot } from "@/modules/shell/components/sidebar-slot";
import { SidebarSkeleton } from "@/modules/shell/components/sidebar-skeleton";
import { TopBar } from "@/modules/shell/components/top-bar";

type Props = { children: ReactNode };

export default function Layout({ children }: Props) {
  return (
    <div className="console">
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarSlot />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense
          fallback={
            <header className="top-bar" aria-busy="true">
              <div className="skeleton ml-auto h-4 w-16" />
            </header>
          }
        >
          <TopBar />
        </Suspense>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
