import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function BlogFrame({ children }: Props) {
  return (
    <main className="framed relative mx-auto w-[min(760px,calc(100%-32px))] flex-1 border-t border-dashed border-line before:absolute before:-top-1 before:-left-1 before:size-[7px] before:border before:border-solid before:border-line before:bg-bg before:content-[''] after:absolute after:-top-1 after:-right-1 after:size-[7px] after:border after:border-solid after:border-line after:bg-bg after:content-['']">
      {children}
    </main>
  );
}
