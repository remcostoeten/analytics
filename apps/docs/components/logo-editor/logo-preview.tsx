import type { Ref } from "react";

import { DropTrail } from "@/components/landing/drop-trail";
import { Logo } from "@/components/logo";
import type { LogoPalette } from "@/components/logo-palette";

import type { LogoPreviewMode } from "./preview-mode";
import styles from "./logo-editor.module.css";

type Props = {
  canvasRef: Ref<HTMLCanvasElement>;
  source?: ImageData;
  palette: LogoPalette;
  preview: LogoPreviewMode;
  original: boolean;
  background: string;
  metalness: number;
  roughness: number;
  loadError: boolean;
  onPreviewChange: (value: LogoPreviewMode) => void;
  onOriginalChange: (value: boolean) => void;
  onBackgroundChange: (value: string) => void;
};

export function LogoPreview({
  canvasRef,
  source,
  palette,
  preview,
  original,
  background,
  metalness,
  roughness,
  loadError,
  onPreviewChange,
  onOriginalChange,
  onBackgroundChange,
}: Props) {
  return (
    <section className={styles.previewPanel} aria-label="Logo preview">
      <div className={styles.previewToolbar}>
        <div className={styles.backgrounds} aria-label="Logo type">
          <button
            type="button"
            aria-pressed={preview === "svg"}
            onClick={() => onPreviewChange("svg")}
          >
            Header SVG
          </button>
          <button
            type="button"
            aria-pressed={preview === "3d"}
            onClick={() => {
              onPreviewChange("3d");
            }}
          >
            3D model
          </button>
          <button
            type="button"
            aria-pressed={preview === "image"}
            onClick={() => {
              onPreviewChange("image");
            }}
          >
            Rendered image
          </button>
        </div>
        <button type="button" aria-pressed={original} onClick={() => onOriginalChange(!original)}>
          {original ? "Show my palette" : "Compare original"}
        </button>
      </div>
      <div className={styles.stage} data-background={background}>
        {preview === "svg" && (
          <div
            className={styles.vector}
            role="img"
            aria-label="Header SVG with the selected palette"
          >
            <Logo palette={original ? undefined : palette} />
          </div>
        )}
        {preview === "3d" && (
          <DropTrail
            palette={original ? undefined : palette}
            metalness={original ? 1 : metalness}
            roughness={original ? 0.2 : roughness}
            size={320}
          />
        )}
        <canvas
          ref={canvasRef}
          hidden={preview !== "image"}
          width={source?.width ?? 400}
          height={source?.height ?? 400}
          role="img"
          aria-label="Logo with the selected palette"
        />
        {preview === "image" && !source && (
          <p role="status">
            {loadError ? "Could not load the logo. Refresh to try again." : "Loading logo…"}
          </p>
        )}
      </div>
      <div className={styles.previewToolbar}>
        <div className={styles.backgrounds} aria-label="Preview background">
          {["checker", "light", "dark"].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={background === value}
              onClick={() => onBackgroundChange(value)}
            >
              {value === "checker" ? "Transparent" : value === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
        <span>
          {preview === "3d"
            ? "Live 3D · React props"
            : preview === "svg"
              ? "SVG · scalable vector"
              : `${source?.width ?? 400} × ${source?.height ?? 400} px`}
        </span>
      </div>
    </section>
  );
}
