import { createLogoSvg } from "@/components/logo-artwork";
import type { LogoPalette } from "@/components/logo-palette";

import { saveLogoFile } from "./save-logo-file";
import styles from "./logo-editor.module.css";

type Props = {
  palette: LogoPalette;
  onCopy: (text: string) => Promise<void>;
};

export function SvgExport({ palette, onCopy }: Props) {
  const svg = createLogoSvg(palette);
  const jsx = `import { Logo } from "@/components/logo";

<Logo
  palette={{
    shadow: "${palette.shadow}",
    midtone: "${palette.midtone}",
    highlight: "${palette.highlight}",
    amount: ${palette.amount},
  }}
/>`;

  return (
    <div className={styles.export}>
      <h2>Use the header SVG</h2>
      <div className={styles.downloads}>
        <button
          className={styles.primary}
          type="button"
          onClick={() => saveLogoFile(new Blob([svg], { type: "image/svg+xml" }), "drop-mark.svg")}
        >
          Download SVG ↓
        </button>
        <button type="button" onClick={() => void onCopy(svg)}>
          Copy SVG
        </button>
        <button type="button" onClick={() => void onCopy(jsx)}>
          Copy JSX
        </button>
      </div>
      <p className={styles.hint}>
        Vector paths and gradients, with a transparent background. Use the JSX to apply these colors
        to the animated header logo.
      </p>
      <details className={styles.settings}>
        <summary>Header component code</summary>
        <textarea aria-label="Header SVG JSX" readOnly value={jsx} rows={12} spellCheck={false} />
      </details>
    </div>
  );
}
