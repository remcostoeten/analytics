import { defaultDropShape, dropShapeControls, type DropShape } from "../landing/drop-shape";
import styles from "./logo-editor.module.css";

type Props = {
  shape: DropShape;
  onChange: (shape: DropShape) => void;
};

const presets = [
  { name: "Original", shape: defaultDropShape },
  { name: "Slender", shape: { ...defaultDropShape, width: 0.85, thickness: 0.7, lean: 0.08 } },
  { name: "Soft", shape: { ...defaultDropShape, width: 1.06, fullness: 0.12, fold: 0.45 } },
  { name: "Sculpted", shape: { ...defaultDropShape, width: 0.94, lean: -0.12, fold: 1.8 } },
];

export function ShapeControls({ shape, onChange }: Props) {
  return (
    <section className={styles.shapeControls} aria-label="Shape controls">
      <div className={styles.sectionHeading}>
        <h2>Shape</h2>
        <button type="button" onClick={() => onChange(defaultDropShape)}>
          Reset shape
        </button>
      </div>
      <div className={styles.downloads}>
        {presets.map((preset) => (
          <button
            key={preset.name}
            type="button"
            aria-pressed={dropShapeControls.every(({ key }) => shape[key] === preset.shape[key])}
            onClick={() => onChange(preset.shape)}
          >
            {preset.name}
          </button>
        ))}
      </div>
      {dropShapeControls.map(({ key, label, min, max, step }) => (
        <label key={key} className={styles.strength}>
          <span>
            {label}
            <span>{shape[key].toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={shape[key]}
            onChange={(event) => onChange({ ...shape, [key]: Number(event.target.value) })}
          />
        </label>
      ))}
      <p className={styles.hint}>
        Ranges preserve the drop silhouette. Check at 32 px for use in a header. Shape changes apply
        to the 3D model; the SVG and rendered image use their original shapes.
      </p>
    </section>
  );
}
