"use client";

import { useEffect, useRef } from "react";

import type { TimeseriesPoint } from "@spoar/contract";

import { mountSparkle } from "../sparkle";

type Props = { points: TimeseriesPoint[] };

const blobs = [0, 1, 2];
const lights = [0, 1, 2, 3, 4, 5, 6, 7];

function SparkleChart({ points }: Props) {
  const sparkRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skyRef = useRef<HTMLCanvasElement>(null);
  const signature = points.map((point) => point.value).join(",");

  useEffect(() => {
    const spark = sparkRef.current;
    const canvas = canvasRef.current;
    const sky = skyRef.current;
    if (!spark || !canvas || !sky) return;
    return mountSparkle(
      {
        host: spark.closest<HTMLElement>("a, button") ?? spark,
        spark,
        canvas,
        sky,
        blobs: Array.from(spark.querySelectorAll<HTMLElement>(".sparkle-blob")),
        bokeh: Array.from(spark.querySelectorAll<HTMLElement>(".sparkle-bokeh")),
      },
      points.map((point) => point.value),
    );
  }, [signature]);

  return (
    <div ref={sparkRef} className="dot-spark" aria-hidden="true">
      <span className="sparkle-haze">
        <canvas ref={skyRef} className="sparkle-sky" />
        {blobs.map((blob) => (
          <span key={blob} className="sparkle-blob" />
        ))}
        {lights.map((light) => (
          <span key={light} className="sparkle-bokeh" />
        ))}
      </span>
      <canvas ref={canvasRef} className="sparkle-dots" />
    </div>
  );
}

export function Sparkline({ points }: Props) {
  if (points.length < 2) return <div className="h-8" />;
  return <SparkleChart points={points} />;
}
