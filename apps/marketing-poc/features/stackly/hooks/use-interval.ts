"use client";

import { useEffect } from "react";

export function useInterval(callback: () => void, delay: number, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(callback, delay);
    return () => window.clearInterval(id);
  }, [callback, delay, enabled]);
}
