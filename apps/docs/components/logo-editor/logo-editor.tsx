"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { LogoPalette } from "@/components/logo-palette";

import type { LogoPreviewMode } from "./preview-mode";
import { LogoPreview } from "./logo-preview";
import { LogoExport } from "./logo-export";
import { saveLogoFile } from "./save-logo-file";
import { defaultPalette, recolorLogo } from "./palette";
import styles from "./logo-editor.module.css";

const presets = [
  { name: "Lilac", shadow: "#34254d", midtone: "#a99ac9", highlight: "#fffaff" },
  { name: "Champagne", shadow: "#49352b", midtone: "#c7a67a", highlight: "#fff5dd" },
  { name: "Copper", shadow: "#451d22", midtone: "#c77351", highlight: "#ffe8cc" },
  { name: "Ocean", shadow: "#102d49", midtone: "#568da9", highlight: "#e1ffff" },
  { name: "Silver", shadow: "#252831", midtone: "#969ca8", highlight: "#ffffff" },
];

const colorFields = [
  { key: "shadow", label: "Shadows" },
  { key: "midtone", label: "Midtones" },
  { key: "highlight", label: "Highlights" },
] as const;

export function LogoEditor() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [source, setSource] = useState<ImageData>();
  const [palette, setPalette] = useState<LogoPalette>(defaultPalette);
  const [background, setBackground] = useState("checker");
  const [original, setOriginal] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [preview, setPreview] = useState<LogoPreviewMode>("svg");
  const [metalness, setMetalness] = useState(1);
  const [roughness, setRoughness] = useState(0.2);
  const settings = JSON.stringify({ source: "/brand/drop-mark.webp", ...palette }, null, 2);
  const componentCode = `import { DropTrail } from "@/components/landing/drop-trail";

export function CustomDrop() {
  return (
    <DropTrail
      palette={{
        shadow: "${palette.shadow}",
        midtone: "${palette.midtone}",
        highlight: "${palette.highlight}",
        amount: ${palette.amount},
      }}
      metalness={${metalness}}
      roughness={${roughness}}
      size={320}
    />
  );
}
`;

  useEffect(() => {
    let disposed = false;
    const image = new Image();
    image.onload = () => {
      if (disposed) return;
      const buffer = document.createElement("canvas");
      buffer.width = image.naturalWidth;
      buffer.height = image.naturalHeight;
      const context = buffer.getContext("2d");
      if (!context) {
        setLoadError(true);
        return;
      }
      context.drawImage(image, 0, 0);
      setSource(context.getImageData(0, 0, buffer.width, buffer.height));
    };
    image.onerror = () => {
      if (!disposed) setLoadError(true);
    };
    image.src = "/brand/drop-mark.webp";
    return () => {
      disposed = true;
      image.onload = null;
      image.onerror = null;
    };
  }, []);

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!source || !context) return;
    const pixels = original ? source.data : recolorLogo(source.data, palette);
    const frame = context.createImageData(source.width, source.height);
    frame.data.set(pixels);
    context.putImageData(frame, 0, 0);
  }, [source, palette, original]);

  function updateColor(key: "shadow" | "midtone" | "highlight", value: string) {
    setOriginal(false);
    setPalette((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  function download(format: "png" | "webp") {
    if (!source) return;
    const output = document.createElement("canvas");
    output.width = source.width;
    output.height = source.height;
    const context = output.getContext("2d");
    if (!context) {
      setMessage("Your browser could not export the image.");
      return;
    }
    const frame = context.createImageData(source.width, source.height);
    frame.data.set(recolorLogo(source.data, palette));
    context.putImageData(frame, 0, 0);
    output.toBlob(
      (blob) => {
        if (!blob) {
          setMessage("Export failed. Please try again.");
          return;
        }
        const extension = blob.type === "image/webp" ? "webp" : "png";
        saveLogoFile(blob, `drop-mark.${extension}`);
        setMessage(`Downloaded drop-mark.${extension}`);
      },
      `image/${format}`,
      1,
    );
  }

  async function copyCode(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied to clipboard.");
    } catch {
      setMessage("Clipboard unavailable. Select the code below or download the file.");
    }
  }

  return (
    <main className={styles.editor}>
      <header className={styles.header}>
        <Link href="/">← Spoar</Link>
        <span>Brand tools / 01</span>
      </header>
      <div className={styles.title}>
        <p>YOUR DROP, YOUR COLORS</p>
        <h1>Logo palette</h1>
        <p>Adjust the colors. Keep the folds, highlights and transparent background.</p>
      </div>
      <div className={styles.workspace}>
        <LogoPreview
          canvasRef={canvas}
          source={source}
          palette={palette}
          preview={preview}
          original={original}
          background={background}
          metalness={metalness}
          roughness={roughness}
          loadError={loadError}
          onPreviewChange={(value) => {
            setPreview(value);
            setMessage("");
          }}
          onOriginalChange={(value) => setOriginal(value)}
          onBackgroundChange={(value) => setBackground(value)}
        />
        <section className={styles.controls} aria-label="Palette controls">
          <div className={styles.sectionHeading}>
            <h2>Palette</h2>
            <button
              type="button"
              onClick={() => {
                setPalette(defaultPalette);
                setMetalness(1);
                setRoughness(0.2);
                setOriginal(false);
                setMessage("");
              }}
            >
              Reset
            </button>
          </div>
          <div className={styles.presets}>
            {presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                aria-pressed={colorFields.every(({ key }) => palette[key] === preset[key])}
                onClick={() => {
                  setPalette({
                    shadow: preset.shadow,
                    midtone: preset.midtone,
                    highlight: preset.highlight,
                    amount: 100,
                  });
                  setOriginal(false);
                  setMessage("");
                }}
              >
                <span
                  style={{
                    background: `linear-gradient(135deg, ${preset.shadow}, ${preset.midtone}, ${preset.highlight})`,
                  }}
                />
                {preset.name}
              </button>
            ))}
          </div>
          <div className={styles.colors}>
            {colorFields.map(({ key, label }) => (
              <label key={key} className={styles.colorField}>
                <input
                  type="color"
                  value={palette[key]}
                  onChange={(event) => updateColor(key, event.target.value)}
                />
                <span>{label}</span>
                <code>{palette[key].toUpperCase()}</code>
              </label>
            ))}
          </div>
          <label className={styles.strength}>
            <span>
              Color strength <span>{palette.amount}%</span>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={palette.amount}
              onChange={(event) => {
                setPalette((current) => ({ ...current, amount: Number(event.target.value) }));
                setOriginal(false);
                setMessage("");
              }}
            />
          </label>
          <p className={styles.hint}>At 0%, the original colors are preserved.</p>
          {preview === "3d" && (
            <>
              <p className={styles.hint}>
                Colors blend from bottom to top on the model. Studio lighting adds the reflections.
              </p>
              <label className={styles.strength}>
                <span>
                  Metalness <span>{Math.round(metalness * 100)}%</span>
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={metalness}
                  onChange={(event) => {
                    setMetalness(Number(event.target.value));
                    setOriginal(false);
                  }}
                />
              </label>
              <label className={styles.strength}>
                <span>
                  Roughness <span>{Math.round(roughness * 100)}%</span>
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={roughness}
                  onChange={(event) => {
                    setRoughness(Number(event.target.value));
                    setOriginal(false);
                  }}
                />
              </label>
            </>
          )}
          <LogoExport
            palette={palette}
            preview={preview}
            componentCode={componentCode}
            settings={settings}
            ready={Boolean(source)}
            onCopy={(text) => copyCode(text)}
            onDownload={(format) => download(format)}
          />
          <p className={styles.status} role="status">
            {message}
          </p>
        </section>
      </div>
    </main>
  );
}
