import Link from "next/link";

import { ArrowIcon } from "@/components/landing/icons";

export function SiteHomeLink() {
  return (
    <Link
      href="/"
      className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-[0.8rem] text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
    >
      <ArrowIcon className="size-3.5 rotate-180" />
      Back to Spoar
    </Link>
  );
}
