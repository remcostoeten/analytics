import type { LogoPalette } from "./logo-palette";

export const logoViewBox = "-25 0 300 300";
export const logoPaths = {
  body: "M134 20C147 3 173 11 167 34C148 80 159 107 193 106Q198 105 199 112C204 143 230 174 227 206C225 254 193 278 134 282C71 286 25 263 21 214C15 169 47 125 74 91Z",
  fold: "M84 79C52 143 95 155 158 182C211 205 212 240 187 265C211 225 155 215 104 190C58 168 47 132 84 79Z",
};

const silverStops = [
  { offset: 0, color: "#8574bd", tone: "shadow" },
  { offset: 0.25, color: "#d5ccf8", tone: "midtone" },
  { offset: 0.48, color: "#f8f6ff", tone: "highlight" },
  { offset: 0.7, color: "#999cd4", tone: "midtone" },
  { offset: 1, color: "#e9e8fc", tone: "highlight" },
] as const;

const foldStops = [
  { offset: 0, color: "#7878aa", tone: "midtone" },
  { offset: 0.45, color: "#eeeaff", tone: "highlight" },
  { offset: 1, color: "#665a96", tone: "shadow" },
] as const;

function mixColor(source: string, target: string | undefined, amount: number) {
  if (!target || !/^#[\da-f]{6}$/i.test(target)) return source;
  const strength = Math.max(0, Math.min(100, amount)) / 100;
  const channels = [1, 3, 5].map((offset) => {
    const start = Number.parseInt(source.slice(offset, offset + 2), 16);
    const end = Number.parseInt(target.slice(offset, offset + 2), 16);
    return Math.round(start + (end - start) * strength)
      .toString(16)
      .padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

/**
 * @name getLogoGradients
 * @description Resolves the vector logo gradient stops from an optional palette.
 * @example const gradients = getLogoGradients(palette);
 */
export function getLogoGradients(palette?: LogoPalette) {
  return {
    silver: silverStops.map((stop) => ({
      offset: stop.offset,
      color: mixColor(stop.color, palette?.[stop.tone], palette?.amount ?? 0),
    })),
    fold: foldStops.map((stop) => ({
      offset: stop.offset,
      color: mixColor(stop.color, palette?.[stop.tone], palette?.amount ?? 0),
    })),
  };
}

/**
 * @name createLogoSvg
 * @description Serializes the vector logo with self-contained paths and gradient colors.
 * @example const blob = new Blob([createLogoSvg(palette)], { type: "image/svg+xml" });
 */
export function createLogoSvg(palette?: LogoPalette) {
  const gradients = getLogoGradients(palette);
  const silver = gradients.silver
    .map((stop) => `<stop offset="${stop.offset}" stop-color="${stop.color}"/>`)
    .join("");
  const fold = gradients.fold
    .map((stop) => `<stop offset="${stop.offset}" stop-color="${stop.color}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${logoViewBox}" fill="none" role="img" aria-labelledby="title">
  <title id="title">Spoar drop</title>
  <defs>
    <linearGradient id="silver" x1=".1" y1=".7" x2=".95" y2=".25">${silver}</linearGradient>
    <linearGradient id="fold" x1="0" y1="0" x2="1" y2="1">${fold}</linearGradient>
  </defs>
  <path fill="url(#silver)" d="${logoPaths.body}"/>
  <path fill="url(#fold)" d="${logoPaths.fold}"/>
</svg>\n`;
}
