"use client";

import Image from "next/image";
import { useEffect, useEffectEvent, useRef } from "react";

import type { DropAppearance } from "./drop-appearance";
import type { createDropScene } from "./drop-scene";

import styles from "./drop-trail.module.css";

type Props = DropAppearance & {
  size?: number;
};

function loadDropScene() {
  return import("./drop-scene");
}

export function DropTrail({ color, palette, metalness, roughness, size }: Props = {}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ReturnType<typeof createDropScene> | undefined>(undefined);
  const syncAppearance = useEffectEvent(() => {
    sceneRef.current?.setAppearance({ color, palette, metalness, roughness });
  });

  useEffect(() => {
    syncAppearance();
  }, [
    color,
    palette?.shadow,
    palette?.midtone,
    palette?.highlight,
    palette?.amount,
    metalness,
    roughness,
  ]);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    let scene: ReturnType<typeof createDropScene> | undefined;
    let visible = false;
    let loading = false;
    let disposed = false;

    function sync() {
      if (!stage) return;
      const active = visible && !document.hidden;
      stage.dataset.paused = String(!active);
      if (active) stage.dataset.entered = "true";
      scene?.setActive(active);
    }

    function load() {
      if (loading || disposed || !canvas || !stage) return;
      loading = true;
      loadDropScene()
        .then(({ createDropScene: createScene }) => {
          if (disposed) return;
          scene = createScene(canvas);
          sceneRef.current = scene;
          syncAppearance();
          stage.dataset.rendered = "true";
          sync();
        })
        .catch((error) => {
          console.warn("The 3D logo could not load; keeping the static logo.", error);
        });
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry && entry.intersectionRatio >= 0.35);
        sync();
        if (visible) load();
      },
      { threshold: [0, 0.35] },
    );

    function handleContextLost(event: Event) {
      event.preventDefault();
      if (stage) delete stage.dataset.rendered;
      scene?.dispose();
      scene = undefined;
      sceneRef.current = undefined;
    }

    observer.observe(stage);
    canvas.addEventListener("webglcontextlost", handleContextLost);
    document.addEventListener("visibilitychange", sync);

    return () => {
      disposed = true;
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      document.removeEventListener("visibilitychange", sync);
      scene?.dispose();
      sceneRef.current = undefined;
      delete stage.dataset.entered;
      delete stage.dataset.paused;
      delete stage.dataset.rendered;
    };
  }, []);

  return (
    <div
      ref={stageRef}
      aria-hidden="true"
      className={styles.stage}
      style={size ? { height: size + 44 } : undefined}
    >
      <span className={styles.halo} />
      <span className={styles.shadow} />
      <div className={styles.reveal} style={size ? { width: size } : undefined}>
        <Image
          src="/brand/drop-mark.webp"
          alt=""
          width={160}
          height={160}
          unoptimized
          className={styles.fallback}
        />
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>
    </div>
  );
}
