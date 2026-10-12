import { useState, type Ref, type RefObject } from "react";

import { DropTrail } from "@/components/landing/drop-trail";
import { Logo } from "@/components/logo";
import type { LogoPalette } from "@/components/logo-palette";
import type { DropShape } from "../landing/drop-shape";
import type { DropImageExporter } from "../landing/drop-scene";

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
  shape: DropShape;
  exportRef: RefObject<DropImageExporter | undefined>;
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
  shape,
  exportRef,
  loadError,
  onPreviewChange,
  onOriginalChange,
  onBackgroundChange,
}: Props) {
  const [rotating, setRotating] = useState(false);
  const [size, setSize] = useState(320);
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
          {original ? "Show my logo" : "Compare original"}
        </button>
      </div>
      {preview === "3d" && (
        <div className={styles.previewToolbar}>
          <div className={styles.backgrounds} aria-label="Preview size">
            {[32, 64, 320].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={size === value}
                onClick={() => setSize(value)}
              >
                {value === 320 ? "Detail" : `${value} px`}
              </button>
            ))}
          </div>
          <button type="button" aria-pressed={rotating} onClick={() => setRotating(!rotating)}>
            {rotating ? "Front view" : "Rotate model"}
          </button>
        </div>
      )}
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
            shape={original ? undefined : shape}
            rotating={rotating}
            size={size}
            exportRef={exportRef}
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
