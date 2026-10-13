import { expect, test } from "bun:test";
import { createDropGeometry } from "./drop-geometry";
import { defaultDropShape, dropShapeControls, resolveDropShape } from "./drop-shape";

test("shape limits keep every extreme combination finite, closed, and inside the camera", () => {
  for (let combination = 0; combination < 2 ** dropShapeControls.length; combination++) {
    const shape = { ...defaultDropShape };
    for (const [index, control] of dropShapeControls.entries()) {
      shape[control.key] = combination & (1 << index) ? control.max : control.min;
    }
    const geometry = createDropGeometry(shape);
    const positions = geometry.getAttribute("position");
    const normals = geometry.getAttribute("normal");
    const indices = geometry.getIndex();
    expect(indices).not.toBeNull();
    if (!indices) throw new Error("The drop must have indexed triangles");
    const edges = new Map<string, number>();
    for (let index = 0; index < indices.count; index += 3) {
      const triangle = [indices.getX(index), indices.getX(index + 1), indices.getX(index + 2)];
      for (let edge = 0; edge < 3; edge++) {
        const a = triangle[edge]!;
        const b = triangle[(edge + 1) % 3]!;
        const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    expect([...edges.values()].every((count) => count === 2)).toBe(true);
    expect([...positions.array, ...normals.array].every((value) => Number.isFinite(value))).toBe(
      true,
    );
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.min.x).toBeGreaterThan(-1.8);
    expect(geometry.boundingBox!.max.x).toBeLessThan(1.8);
    expect(geometry.boundingBox!.min.y).toBeGreaterThan(-1.95);
    expect(geometry.boundingBox!.max.y).toBeLessThan(1.65);
    geometry.dispose();
  }
});

test("invalid shape inputs fall back or clamp without changing the original defaults", () => {
  expect(resolveDropShape({ width: NaN, fold: Infinity, thickness: -1 })).toEqual({
    ...defaultDropShape,
    thickness: 0.55,
  });
  const original = createDropGeometry();
  const explicit = createDropGeometry(defaultDropShape);
  expect(original.getAttribute("position").array).toEqual(explicit.getAttribute("position").array);
  original.dispose();
  explicit.dispose();
});
