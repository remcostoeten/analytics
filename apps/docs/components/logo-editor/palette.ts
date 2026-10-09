import type { LogoPalette } from "@/components/logo-palette";

export const defaultPalette: LogoPalette = {
  shadow: "#34254d",
  midtone: "#a99ac9",
  highlight: "#fffaff",
  amount: 100,
};

function channels(hex: string) {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

/**
 * @name recolorLogo
 * @description Maps image luminance to three palette colors while preserving alpha and source pixels.
 * @example const pixels = recolorLogo(source.data, defaultPalette);
 */
export function recolorLogo(source: Uint8ClampedArray, palette: LogoPalette) {
  const output = new Uint8ClampedArray(source);
  const shadow = channels(palette.shadow);
  const midtone = channels(palette.midtone);
  const highlight = channels(palette.highlight);
  const strength = Math.max(0, Math.min(100, palette.amount)) / 100;

  for (let index = 0; index < source.length; index += 4) {
    if (source[index + 3] === 0) continue;
    const luminance =
      (source[index] * 0.2126 + source[index + 1] * 0.7152 + source[index + 2] * 0.0722) / 255;
    const start = luminance < 0.5 ? shadow : midtone;
    const end = luminance < 0.5 ? midtone : highlight;
    const blend = luminance < 0.5 ? luminance * 2 : (luminance - 0.5) * 2;
    for (let channel = 0; channel < 3; channel++) {
      const mapped = start[channel] + (end[channel] - start[channel]) * blend;
      output[index + channel] = source[index + channel] * (1 - strength) + mapped * strength;
    }
  }
  return output;
}
