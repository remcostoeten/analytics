import { saveLogoFile } from "./save-logo-file";
import styles from "./logo-editor.module.css";

type Props = {
  preview: LogoPreviewMode;
  palette: LogoPalette;
  componentCode: string;
  settings: string;
  ready: boolean;
  onCopy: (text: string) => Promise<void>;
  onDownload: (format: "png" | "webp") => void;
};

export function LogoExport({
  preview,
  palette,
  componentCode,
  settings,
  ready,
  onCopy,
  onDownload,
}: Props) {
  if (preview === "svg") return <SvgExport palette={palette} onCopy={(text) => onCopy(text)} />;
  return preview === "3d" ? (
    <div className={styles.export}>
      <h2>Use the 3D component</h2>
      <div className={styles.downloads}>
        <button type="button" className={styles.primary} onClick={() => void onCopy(componentCode)}>
          Copy JSX
        </button>
        <button
          type="button"
          onClick={() =>
            saveLogoFile(new Blob([componentCode], { type: "text/plain" }), "custom-drop.tsx")
          }
        >
          TSX ↓
        </button>
      </div>
      <p className={styles.hint}>
        Paste into this project to use your palette. Props update the model and its reflection live.
      </p>
      <details className={styles.settings}>
        <summary>Component code</summary>
        <textarea
          aria-label="3D component JSX"
          readOnly
          value={componentCode}
          rows={15}
          spellCheck={false}
        />
      </details>
    </div>
  ) : (
    <>
      <div className={styles.export}>
        <h2>Take it with you</h2>
        <div className={styles.downloads}>
          <button
            className={styles.primary}
            type="button"
            disabled={!ready}
            onClick={() => onDownload("webp")}
          >
            Download WebP ↓
          </button>
          <button type="button" disabled={!ready} onClick={() => onDownload("png")}>
            PNG ↓
          </button>
        </div>
        <p className={styles.hint}>
          Exports use your palette at the original resolution, with transparency. The preview
          background is excluded.
        </p>
        <p className={styles.hint}>
          These exports use the original rendered image. Choose Header SVG for the vector logo used
          in the header.
        </p>
      </div>
      <details className={styles.settings}>
        <summary>Palette settings</summary>
        <textarea aria-label="Palette JSON" readOnly value={settings} rows={8} spellCheck={false} />
        <div className={styles.downloads}>
          <button type="button" onClick={() => void onCopy(settings)}>
            Copy JSON
          </button>
          <button
            type="button"
            onClick={() =>
              saveLogoFile(new Blob([settings], { type: "application/json" }), "logo-palette.json")
            }
          >
            Download JSON ↓
          </button>
        </div>
      </details>
    </>
  );
}
import type { LogoPalette } from "@/components/logo-palette";

import type { LogoPreviewMode } from "./preview-mode";
import { SvgExport } from "./svg-export";
