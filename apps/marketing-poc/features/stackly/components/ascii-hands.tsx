"use client";

import type { PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { useInView } from "../hooks/use-in-view";

type Cell = {
  x: number;
  y: number;
  depth: number;
  side: "left" | "right";
};

const leftArm =
  "M0 110 C50 98 100 96 140 102 C160 105 176 110 188 116 L198 119 C208 117 218 120 228 125 L226 131 L212 132 L214 138 L200 140 L202 146 L190 147 L190 152 L176 152 C164 156 150 158 134 162 C90 172 45 182 0 188 Z";

const rightArm =
  "M460 58 C420 64 384 74 350 88 C322 99 300 110 282 122 C272 129 266 134 260 138 L250 142 L242 148 L248 153 L258 150 L262 156 L272 150 L280 154 L286 146 C300 142 318 136 338 130 C378 120 418 112 460 116 Z";

const glyphs = [".", ":", "-", "=", "+", "*", "#", "@"] as const;
const step = 6;

function glyphFor(depth: number, boost: number) {
  const index = Math.min(glyphs.length - 1, Math.floor(depth * 4 + boost));
  return glyphs[index] ?? ".";
}

export function AsciiHands() {
  const svg = useRef<SVGSVGElement>(null);
  const probeLeft = useRef<SVGPathElement>(null);
  const probeRight = useRef<SVGPathElement>(null);
  const cellRefs = useRef<(SVGTextElement | null)[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [phase, setPhase] = useState(0);
  const inView = useInView(svg, 0.3);

  useEffect(() => {
    const left = probeLeft.current;
    const right = probeRight.current;
    const root = svg.current;
    if (!left || !right || !root) return;
    const found: Cell[] = [];
    const point = root.createSVGPoint();
    for (let y = step; y < 260; y += step) {
      for (let x = step / 2; x < 460; x += step) {
        point.x = x;
        point.y = y;
        const side = left.isPointInFill(point)
          ? "left"
          : right.isPointInFill(point)
            ? "right"
            : null;
        if (!side) continue;
        let depth = 1;
        for (const [dx, dy] of [
          [0, -step],
          [0, step],
          [-step, 0],
          [step, 0],
        ]) {
          point.x = x + dx;
          point.y = y + dy;
          const inside = side === "left" ? left.isPointInFill(point) : right.isPointInFill(point);
          if (!inside) depth -= 0.3;
        }
        found.push({ x, y, depth: Math.max(0, depth), side });
      }
    }
    setCells(found);
  }, []);

  useEffect(() => {
    if (!inView) return;
    const id = window.setInterval(() => setPhase((value) => (value + 1) % 60), 90);
    return () => window.clearInterval(id);
  }, [inView]);

  function sweep(event: PointerEvent<SVGSVGElement>) {
    const root = svg.current;
    if (!root) return;
    const bounds = root.getBoundingClientRect();
    const px = ((event.clientX - bounds.left) / bounds.width) * 460;
    const py = ((event.clientY - bounds.top) / bounds.height) * 260;
    cells.forEach((cell, index) => {
      const element = cellRefs.current[index];
      if (!element) return;
      const distance = Math.hypot(cell.x - px, cell.y - py);
      const boost = distance < 50 ? 3 : distance < 90 ? 1.5 : 0;
      element.textContent = glyphFor(cell.depth, boost);
      element.setAttribute(
        "fill",
        boost > 2 ? "#ffb074" : boost > 0 ? "#f0863a" : cell.depth > 0.6 ? "#e8742b" : "#8a4216",
      );
    });
  }

  function rest() {
    cells.forEach((cell, index) => {
      const element = cellRefs.current[index];
      if (!element) return;
      element.textContent = glyphFor(cell.depth, 0);
      element.setAttribute("fill", cell.depth > 0.6 ? "#e8742b" : "#8a4216");
    });
  }

  const reach = Math.sin((phase / 60) * Math.PI * 2) * 5;

  return (
    <svg
      ref={svg}
      viewBox="0 0 460 260"
      className="h-full w-full cursor-crosshair select-none"
      onPointerMove={sweep}
      onPointerLeave={rest}
      aria-hidden
    >
      <path ref={probeLeft} d={leftArm} fill="#000" fillOpacity="0" />
      <path ref={probeRight} d={rightArm} fill="#000" fillOpacity="0" />
      <g fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="6.8" textAnchor="middle">
        {cells.map((cell, index) => {
          const wave = Math.sin((cell.x + phase * 6) / 18) * 0.5 + 0.5;
          const shift = cell.side === "left" ? reach : -reach;
          return (
            <text
              key={`${cell.x}-${cell.y}`}
              ref={(element) => {
                cellRefs.current[index] = element;
              }}
              x={cell.x + shift}
              y={cell.y + 2.5}
              fill={cell.depth > 0.6 ? "#e8742b" : "#8a4216"}
              opacity={0.55 + wave * 0.45 * cell.depth + 0.1}
              style={{ transition: "x 600ms ease" }}
            >
              {glyphFor(cell.depth, 0)}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
