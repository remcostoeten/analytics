import { describe, expect, test } from "bun:test";

import { defaultPalette, recolorLogo } from "./palette";

describe("recolorLogo", () => {
  test("preserves the original at zero strength without mutating it", () => {
    const source = new Uint8ClampedArray([45, 98, 220, 170]);
    expect(recolorLogo(source, { ...defaultPalette, amount: 0 })).toEqual(source);
    recolorLogo(source, defaultPalette);
    expect([...source]).toEqual([45, 98, 220, 170]);
  });

  test("maps black and white to the palette endpoints while retaining alpha", () => {
    const source = new Uint8ClampedArray([0, 0, 0, 128, 255, 255, 255, 255]);
    const result = recolorLogo(source, {
      shadow: "#102030",
      midtone: "#8090a0",
      highlight: "#abcdef",
      amount: 100,
    });
    expect([...result]).toEqual([16, 32, 48, 128, 171, 205, 239, 255]);
  });

  test("retains fully transparent pixels and blends partial strength", () => {
    const source = new Uint8ClampedArray([20, 30, 40, 0, 0, 0, 0, 200]);
    const result = recolorLogo(source, { ...defaultPalette, shadow: "#204060", amount: 50 });
    expect([...result]).toEqual([20, 30, 40, 0, 16, 32, 48, 200]);
  });
});
