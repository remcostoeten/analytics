"use client";

import { useEffect, useState } from "react";

import { commands } from "../content";

type Line = { kind: "input" | "output"; text: string };

export function Terminal() {
  const [lines, setLines] = useState<Line[]>([]);
  const [typing, setTyping] = useState("");

  useEffect(() => {
    let cancelled = false;
    let commandIndex = 0;

    async function wait(ms: number) {
      await new Promise((resolve) => window.setTimeout(resolve, ms));
    }

    async function run() {
      while (!cancelled) {
        const command = commands[commandIndex % commands.length];
        if (!command) return;
        for (let index = 1; index <= command.input.length; index += 1) {
          if (cancelled) return;
          setTyping(command.input.slice(0, index));
          await wait(28 + Math.random() * 40);
        }
        await wait(300);
        setLines((current) => [...current.slice(-14), { kind: "input", text: command.input }]);
        setTyping("");
        for (const text of command.lines) {
          if (cancelled) return;
          await wait(90);
          setLines((current) => [...current.slice(-14), { kind: "output", text }]);
        }
        await wait(2200);
        commandIndex += 1;
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mono h-full overflow-hidden border border-[#2a2a2e] bg-[#070708] p-6 text-[12.5px] leading-[1.7] text-[#c4c4c9]">
      <div className="mb-4 flex items-center justify-between text-[10px] tracking-[0.2em] text-[#5a5a60] uppercase">
        <span>stackly · zsh</span>
        <span>80×24</span>
      </div>
      {lines.map((line, index) => (
        <div
          key={`${index}-${line.text}`}
          className={line.kind === "input" ? "text-[#f2f1ed]" : "text-[#9a9a9f]"}
        >
          {line.kind === "input" ? <span className="text-[#d8ff3a]">$ </span> : null}
          <span className="whitespace-pre">{line.text}</span>
        </div>
      ))}
      <div className="text-[#f2f1ed]">
        <span className="text-[#d8ff3a]">$ </span>
        <span className="whitespace-pre">{typing}</span>
        <span className="caret inline-block w-[8px] translate-y-[2px] bg-[#f2f1ed]">&nbsp;</span>
      </div>
    </div>
  );
}
