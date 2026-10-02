"use client";

import { useEffect, useState } from "react";

export function useClock() {
  const [now, setNow] = useState<string>("00:00:00");

  useEffect(() => {
    function update() {
      setNow(new Date().toISOString().slice(11, 19));
    }
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, []);

  return now;
}
