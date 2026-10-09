import { expect, test } from "bun:test";

import { createLogoSvg, getLogoGradients } from "./logo-artwork";

const palette = { shadow: "#451d22", midtone: "#c77351", highlight: "#ffe8cc", amount: 100 };

test("the downloadable default matches the component artwork", async () => {
  const file = Bun.file(new URL("../public/brand/drop-mark.svg", import.meta.url));
  expect(await file.text()).toBe(createLogoSvg());
});

test("SVG exports use vector paths with the selected colors", () => {
  const svg = createLogoSvg(palette);
  expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  expect(svg).toContain('stop-color="#451d22"');
  expect(svg).toContain('stop-color="#c77351"');
  expect(svg).toContain('stop-color="#ffe8cc"');
  expect(svg.match(/<path /g)).toHaveLength(2);
  expect(svg).not.toContain("<image");
});

test("zero strength preserves defaults and invalid colors cannot enter SVG markup", () => {
  expect(getLogoGradients({ ...palette, amount: 0 })).toEqual(getLogoGradients());
  expect(createLogoSvg({ ...palette, shadow: '"/><script>alert(1)</script>' })).not.toContain(
    "<script",
  );
});
