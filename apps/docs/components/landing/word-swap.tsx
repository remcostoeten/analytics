"use client";

import { useEffect, useState } from "react";

type Props = {
  words: string[];
  interval?: number;
};

export function WordSwap({ words, interval = 2400 }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % words.length);
    }, interval);

    return () => window.clearInterval(id);
  }, [words.length, interval]);

  return (
    <span className="word-swap">
      {words.map((word, position) => (
        <span
          key={word}
          aria-hidden={position !== index}
          data-active={position === index}
          className="word-swap-item accent-text"
        >
          {word}
        </span>
      ))}
    </span>
  );
}
