"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@%&*+=-_/<>[]{}";

export function useScramble(text: string, speed = 28) {
  const [output, setOutput] = useState(text);
  const frame = useRef(0);

  useEffect(() => {
    setOutput(text);
  }, [text]);

  const play = useCallback(() => {
    window.clearInterval(frame.current);
    let step = 0;
    frame.current = window.setInterval(() => {
      step += 1;
      const settled = Math.floor((step / text.length) * text.length * 0.5);
      setOutput(
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < settled) return char;
            return pool[Math.floor(Math.random() * pool.length)] ?? char;
          })
          .join(""),
      );
      if (settled >= text.length) {
        window.clearInterval(frame.current);
        setOutput(text);
      }
    }, speed);
  }, [text, speed]);

  useEffect(() => () => window.clearInterval(frame.current), []);

  return { output, play };
}
