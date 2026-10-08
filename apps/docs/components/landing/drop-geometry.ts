import { BufferGeometry, Float32BufferAttribute, Shape, ShapeUtils } from "three";

function outlinePoints() {
  const shape = new Shape();
  shape.moveTo(134, 20);
  shape.bezierCurveTo(147, 3, 173, 11, 167, 34);
  shape.bezierCurveTo(148, 80, 159, 107, 193, 106);
  shape.quadraticCurveTo(198, 105, 199, 112);
  shape.bezierCurveTo(204, 143, 230, 174, 227, 206);
  shape.bezierCurveTo(225, 254, 193, 278, 134, 282);
  shape.bezierCurveTo(71, 286, 25, 263, 21, 214);
  shape.bezierCurveTo(15, 169, 47, 125, 74, 91);
  shape.lineTo(134, 20);
  const points = shape.getSpacedPoints(128).slice(0, -1);
  for (const point of points) point.set((point.x - 124) / 100, (150 - point.y) / 100);
  if (ShapeUtils.isClockWise(points)) points.reverse();
  return points;
}

/**
 * @name createDropGeometry
 * @description Builds a closed, rounded volume from the Spoar silhouette.
 * @example const geometry = createDropGeometry();
 */
export function createDropGeometry() {
  const outline = outlinePoints();
  const segments = outline.length;
  const rings = 48;
  const positions = [0, -0.25, 0.72];
  const indices: number[] = [];

  for (let ring = 1; ring < rings; ring++) {
    const angle = (ring / rings) * Math.PI;
    const radius = Math.sin(angle);
    const depth = Math.cos(angle);
    for (const point of outline) {
      const x = point.x * radius;
      const y = -0.25 + (point.y + 0.25) * radius;
      const foldX = 0.55 * Math.sin((y + 0.1) * 2.1);
      const fold = Math.exp(-((x + foldX) ** 2) / 0.006);
      const taper = Math.max(0, 1 - (y / 1.4) ** 4);
      const z = depth * (0.72 - 0.065 * fold * taper * radius);
      positions.push(x, y, z);
    }
  }

  const back = positions.length / 3;
  positions.push(0, -0.25, -0.72);
  for (let segment = 0; segment < segments; segment++) {
    const next = (segment + 1) % segments;
    indices.push(0, 1 + segment, 1 + next);
    for (let ring = 0; ring < rings - 2; ring++) {
      const a = 1 + ring * segments + segment;
      const b = a + segments;
      const d = 1 + ring * segments + next;
      const c = d + segments;
      indices.push(a, b, d, b, c, d);
    }
    const last = 1 + (rings - 2) * segments;
    indices.push(last + segment, back, last + next);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
