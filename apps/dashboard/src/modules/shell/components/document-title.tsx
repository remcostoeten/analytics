"use client";

import { useEffect } from "react";

type Props = { title: string };

export function DocumentTitle({ title }: Props) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | Spoar`;
    return () => {
      document.title = previous;
    };
  }, [title]);
  return null;
}
