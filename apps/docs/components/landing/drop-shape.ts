export type DropShape = {
  width: number;
  fullness: number;
  lean: number;
  thickness: number;
  fold: number;
};

export const defaultDropShape: DropShape = {
  width: 1,
  fullness: 0,
  lean: 0,
  thickness: 1,
  fold: 1,
};

export const dropShapeControls = [
  { key: "width", label: "Width", min: 0.8, max: 1.15, step: 0.01 },
  { key: "fullness", label: "Fullness", min: -0.15, max: 0.15, step: 0.01 },
  { key: "lean", label: "Tip lean", min: -0.2, max: 0.2, step: 0.01 },
  { key: "thickness", label: "Thickness", min: 0.55, max: 1.15, step: 0.01 },
  { key: "fold", label: "Fold depth", min: 0, max: 2, step: 0.05 },
] as const;

/**
 * @name resolveDropShape
 * @description Keeps shape parameters within the logo's supported proportions.
 * @example const shape = resolveDropShape({ width: 0.9 });
 */
export function resolveDropShape(input: Partial<DropShape> = {}): DropShape {
  const shape = { ...defaultDropShape };
  for (const { key, min, max } of dropShapeControls) {
    const value = input[key] ?? defaultDropShape[key];
    shape[key] = Number.isFinite(value)
      ? Math.min(max, Math.max(min, value))
      : defaultDropShape[key];
  }
  return shape;
}
