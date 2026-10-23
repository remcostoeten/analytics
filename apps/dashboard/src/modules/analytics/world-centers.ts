import world from "./world-shapes.json";

export type CountryCenter = { code: string; name: string; x: number; y: number };

type Point = readonly [number, number];

const numberPattern = /-?\d+(?:\.\d+)?/g;

function parseRing(ring: string): Point[] {
  const numbers = (ring.match(numberPattern) ?? []).map(Number);
  const points: Point[] = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    points.push([numbers[index] ?? 0, numbers[index + 1] ?? 0]);
  }
  return points;
}

function centroid(points: readonly Point[]): { x: number; y: number; area: number } {
  let area = 0;
  let x = 0;
  let y = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length] ?? point;
    const cross = point[0] * next[1] - next[0] * point[1];
    area += cross / 2;
    x += (point[0] + next[0]) * cross;
    y += (point[1] + next[1]) * cross;
  });
  if (area === 0) {
    const count = Math.max(1, points.length);
    return {
      x: points.reduce((sum, point) => sum + point[0], 0) / count,
      y: points.reduce((sum, point) => sum + point[1], 0) / count,
      area: 0,
    };
  }
  return { x: x / (6 * area), y: y / (6 * area), area: Math.abs(area) };
}

function largestRing(path: string) {
  return path
    .split("M")
    .filter((ring) => ring !== "")
    .map((ring) => centroid(parseRing(ring)))
    .reduce<ReturnType<typeof centroid> | null>(
      (best, ring) => (best === null || ring.area > best.area ? ring : best),
      null,
    );
}

const centers = new Map<string, CountryCenter>();

for (const shape of world.shapes) {
  const ring = largestRing(shape.path);
  if (ring && !centers.has(shape.code)) {
    centers.set(shape.code, { code: shape.code, name: shape.name, x: ring.x, y: ring.y });
  }
}

/**
 * @name countryCenter
 * @description The map position of a country, taken from the centroid of its largest landmass in
 * the 960 by 560 world map, or null when the code has no shape.
 *
 * @example
 * const centre = countryCenter("NL");
 */
export function countryCenter(code: string): CountryCenter | null {
  return centers.get(code) ?? null;
}
