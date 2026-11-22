import { noop } from "@spoar/shared/noop";

type Lab = [number, number, number];

export type SparkleParts = {
  host: HTMLElement;
  spark: HTMLElement;
  canvas: HTMLCanvasElement;
  sky: HTMLCanvasElement;
  blobs: HTMLElement[];
  bokeh: HTMLElement[];
};

type Dots = {
  count: number;
  columns: number;
  width: number;
  xs: Float32Array;
  ys: Float32Array;
  row: Uint8Array;
  kind: Uint8Array;
  per: Float32Array;
  ph: Float32Array;
  lastK: Int32Array;
  r1: Float32Array;
  peak: Float32Array;
  bucket: Uint8Array;
  pop: Uint8Array;
  f1: Float32Array;
  f2: Float32Array;
  p1: Float32Array;
  p2: Float32Array;
  weight: Float32Array;
  groups: number[][];
  tops: number[];
  heights: number[];
  latest: number;
};

type Glint = { index: number; start: number };

type Card = {
  parts: SparkleParts;
  ctx: CanvasRenderingContext2D;
  values: number[];
  seed: number;
  rand: () => number;
  washPeriod: number;
  washPhase: number;
  washDir: number;
  clock: number;
  bornAt: number;
  nextGlint: number;
  glints: Glint[];
  ratio: number;
  hover: boolean;
  visible: boolean;
  dirty: boolean;
  dots: Dots | null;
};

type Paint = {
  tones: string[];
  hover: string;
  buckets: string[];
  haze: string;
  halo: string[];
};

const TAU = Math.PI * 2;
const ROWS = 6;
const HEIGHT = 32;
const PAD = 12;
const HAZE_X = 14;
const HAZE_TOP = 20;
const HAZE_BOTTOM = 13;
const REVEAL = 420;
const INTENSITY = 0.7;
const DENSITY = 0.22;
const MAX_SLOTS = 1024;
const MAX_HALOS = 96;
const NARROW_BOKEH = 5;
const DIM = 0;
const HOT = 1;
const T1 = 2;
const T2 = 3;
const T3 = 4;
const T4 = 5;
const PEACH = 6;
const LILAC = 7;
const BUCKETS = 8;
const trail = [4, 2];
const latestTrail = [5, 3];

const slots = Array.from({ length: BUCKETS }, () => new Int16Array(MAX_SLOTS));
const alphas = Array.from({ length: BUCKETS }, () => new Float32Array(MAX_SLOTS));
const fill = new Int16Array(BUCKETS);
const haloData = new Float32Array(4 * MAX_HALOS);
const cards = new Set<Card>();

let haloCount = 0;
let pending = 0;
let previous = 0;
let paint: Paint | null = null;
let sprite: HTMLCanvasElement | null = null;
let probe: CanvasRenderingContext2D | null = null;
let themeWatch: MutationObserver | null = null;
let motionQuery: MediaQueryList | null = null;

function mulberry(seed: number) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(first: number, second: number) {
  let value =
    Math.imul(first ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(second + 0x7f4a7c15, 0xc2b2ae35);
  value ^= value >>> 15;
  value = Math.imul(value, 0x2c1b3c6d);
  value ^= value >>> 12;
  value = Math.imul(value, 0x297a2d39);
  value ^= value >>> 15;
  return value >>> 0;
}

function seedOf(values: number[]) {
  return values.reduce((seed, value) => hash(seed, Math.round(value * 100)), 17) % 100000;
}

function fraction(value: number) {
  return value - Math.floor(value);
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function resample(values: number[], columns: number) {
  if (values.length >= columns) {
    return Array.from({ length: columns }, (_, column) => {
      const from = Math.floor((column * values.length) / columns);
      const to = Math.max(from + 1, Math.floor(((column + 1) * values.length) / columns));
      const bucket = values.slice(from, to);
      return bucket.reduce((sum, value) => sum + value, 0) / bucket.length;
    });
  }
  return Array.from({ length: columns }, (_, column) => {
    const position = (column / (columns - 1)) * (values.length - 1);
    const left = Math.floor(position);
    const right = Math.min(left + 1, values.length - 1);
    const weight = position - left;
    return (values[left] ?? 0) * (1 - weight) + (values[right] ?? 0) * weight;
  });
}

function srgbToLinear(channel: number) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function toOklab(red: number, green: number, blue: number): Lab {
  const r = srgbToLinear(red);
  const g = srgbToLinear(green);
  const b = srgbToLinear(blue);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function blend(first: Lab, second: Lab, weight: number): Lab {
  return [
    first[0] * weight + second[0] * (1 - weight),
    first[1] * weight + second[1] * (1 - weight),
    first[2] * weight + second[2] * (1 - weight),
  ];
}

function encodeChannel(value: number) {
  const linear = clamp(value);
  const gamma = linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055;
  return Math.round(gamma * 255);
}

function toCss(lab: Lab, alpha = 1) {
  const l = (lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2]) ** 3;
  const m = (lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2]) ** 3;
  const s = (lab[0] - 0.0894841775 * lab[1] - 1.291485548 * lab[2]) ** 3;
  const red = encodeChannel(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const green = encodeChannel(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const blue = encodeChannel(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function readToken(name: string): Lab {
  if (!probe) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    probe = canvas.getContext("2d", { willReadFrequently: true });
  }
  const css = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!probe || !css) return [0.5, 0, 0];
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "#000000";
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const [red = 0, green = 0, blue = 0] = probe.getImageData(0, 0, 1, 1).data;
  return toOklab(red, green, blue);
}

function createPaint(): Paint {
  const land = readToken("--map-land");
  const surface = readToken("--surface");
  const orange = readToken("--series-1");
  const unlit = blend(land, surface, 0.85);
  const light = surface[0] > 0.6;
  const hot = light
    ? blend(orange, readToken("--accent-ink"), 0.5)
    : blend(orange, readToken("--fg"), 0.68);
  const steps = [0.28, 0.46, 0.64, 0.82].map((weight) => blend(orange, land, weight));
  const tones = [unlit, ...steps, orange].map((lab) => toCss(lab));
  return {
    tones,
    hover: toCss(blend(orange, unlit, 0.12)),
    buckets: [
      tones[0] ?? "",
      toCss(hot),
      tones[1] ?? "",
      tones[2] ?? "",
      tones[3] ?? "",
      tones[4] ?? "",
      toCss(readToken("--sparkle-peach")),
      toCss(readToken("--sparkle-lilac")),
    ],
    haze: toCss(orange),
    halo: [toCss(hot, 0.95), toCss(orange, 0.36), toCss(orange, 0)],
  };
}

function currentPaint() {
  if (!paint) paint = createPaint();
  return paint;
}

function currentSprite() {
  if (sprite) return sprite;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const [center = "", mid = "", edge = ""] = currentPaint().halo;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, center);
    gradient.addColorStop(0.3, mid);
    gradient.addColorStop(1, edge);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }
  sprite = canvas;
  return sprite;
}

function createDots(count: number, columns: number, width: number): Dots {
  return {
    count,
    columns,
    width,
    xs: new Float32Array(count),
    ys: new Float32Array(count),
    row: new Uint8Array(count),
    kind: new Uint8Array(count),
    per: new Float32Array(count),
    ph: new Float32Array(count),
    lastK: new Int32Array(count).fill(-1),
    r1: new Float32Array(count),
    peak: new Float32Array(count),
    bucket: new Uint8Array(count),
    pop: new Uint8Array(count),
    f1: new Float32Array(count),
    f2: new Float32Array(count),
    p1: new Float32Array(count),
    p2: new Float32Array(count),
    weight: new Float32Array(count),
    groups: [[], [], [], [], [], []],
    tops: [],
    heights: [],
    latest: -1,
  };
}

function build(card: Card) {
  const width = card.parts.spark.clientWidth;
  if (width < 24) return;
  const columns = width >= 300 ? 52 : 32;
  const rand = mulberry(card.seed * 7919 + columns);
  const levels = resample(card.values, columns);
  const min = Math.min(...levels);
  const range = Math.max(...levels) - min;
  const dots = createDots(columns * ROWS, columns, width);
  const pitch = width / columns;
  let below = 0;
  let above = 0;
  let index = 0;
  levels.forEach((value, column) => {
    const ratio = range > 0 ? (value - min) / range : 0.5;
    const level = 1 + Math.round(ratio * (ROWS - 1));
    const last = column === columns - 1;
    const tones = last ? latestTrail : trail;
    dots.heights.push(level);
    for (let row = 0; row < ROWS; row += 1) {
      const depth = level - 1 - row;
      const tone = depth >= 0 ? (tones[depth] ?? 0) : 0;
      dots.xs[index] = (column + 0.5) * pitch;
      dots.ys[index] = ((ROWS - row - 0.5) * HEIGHT) / ROWS;
      dots.row[index] = row;
      dots.per[index] = 2.4 + rand() * 4.6;
      dots.ph[index] = rand() * 900;
      dots.f1[index] = TAU / (2.2 + rand() * 3.2);
      dots.f2[index] = TAU / (0.7 + rand() * 1.1);
      dots.p1[index] = rand() * TAU;
      dots.p2[index] = rand() * TAU;
      if (depth < 0) {
        dots.kind[index] = 0;
        above += 1;
      } else if (depth >= 2) {
        dots.kind[index] = 1;
        below += 1;
      } else if (depth === 1) {
        dots.kind[index] = 2;
      } else if (last) {
        dots.kind[index] = 4;
        dots.latest = index;
      } else {
        dots.kind[index] = 3;
        dots.tops.push(index);
      }
      if (index !== dots.latest) dots.groups[tone]?.push(index);
      index += 1;
    }
  });
  const mean = (below * 1.3 + above * 0.62) / Math.max(1, below + above);
  for (let i = 0; i < dots.count; i += 1) {
    dots.weight[i] = (dots.kind[i] === 1 ? 1.3 : 0.62) / mean;
  }
  card.ratio = Math.min(2, window.devicePixelRatio || 1);
  card.parts.canvas.width = Math.round((width + PAD * 2) * card.ratio);
  card.parts.canvas.height = Math.round((HEIGHT + PAD * 2) * card.ratio);
  card.dots = dots;
  card.glints.length = 0;
  card.dirty = true;
  buildHaze(card);
}

function placeBlobs(card: Card, dots: Dots, rand: () => number) {
  const pitch = dots.width / dots.columns;
  const ranked = dots.heights
    .map((level, column) => ({ level, column }))
    .sort((first, second) => second.level - first.level || first.column - second.column);
  const peaks: { level: number; column: number }[] = [];
  ranked.forEach((entry) => {
    const apart = peaks.every((peak) => Math.abs(peak.column - entry.column) > dots.columns / 5);
    if (peaks.length < card.parts.blobs.length && apart) peaks.push(entry);
  });
  const tints = ["var(--series-1)", "var(--sparkle-peach)", "var(--series-1)"];
  card.parts.blobs.forEach((blob, index) => {
    const peak = peaks[index] ?? ranked[index];
    if (!peak) return;
    const width = 84 + rand() * 44;
    const height = 50 + rand() * 18;
    const x = HAZE_X + (peak.column + 0.5) * pitch;
    const y = HAZE_TOP + ((ROWS - peak.level + 0.5) * HEIGHT) / ROWS;
    blob.style.left = `${(x - width / 2).toFixed(1)}px`;
    blob.style.top = `${(y - height / 2 + 4).toFixed(1)}px`;
    blob.style.width = `${width.toFixed(1)}px`;
    blob.style.height = `${height.toFixed(1)}px`;
    blob.style.setProperty("--c", tints[index % tints.length] ?? "");
    blob.style.setProperty("--o", (0.6 + rand() * 0.4).toFixed(2));
    blob.style.setProperty("--dx", `${(10 + rand() * 16).toFixed(1)}px`);
    blob.style.setProperty("--dy", `${(2 + rand() * 4).toFixed(1)}px`);
    blob.style.setProperty("--dur", `${(8 + rand() * 9).toFixed(2)}s`);
    blob.style.setProperty("--delay", `${(-rand() * 12).toFixed(2)}s`);
  });
}

function placeBokeh(card: Card, dots: Dots, rand: () => number, boxHeight: number) {
  const lights = ["var(--series-1)", "var(--sparkle-peach)", "var(--sparkle-lilac)"];
  const narrow = dots.columns < 52;
  card.parts.bokeh.forEach((light, index) => {
    light.style.display = narrow && index >= NARROW_BOKEH ? "none" : "";
    const size = 8 + rand() * 7;
    light.style.left = `${(HAZE_X + rand() * (dots.width - size)).toFixed(1)}px`;
    light.style.top = `${(8 + rand() * (boxHeight - 20 - size)).toFixed(1)}px`;
    light.style.width = `${size.toFixed(1)}px`;
    light.style.height = `${size.toFixed(1)}px`;
    light.style.setProperty("--c", lights[index % lights.length] ?? "");
    light.style.setProperty("--o", (0.35 + rand() * 0.45).toFixed(2));
    light.style.setProperty("--dur", `${(5 + rand() * 7).toFixed(2)}s`);
    light.style.setProperty("--delay", `${(-rand() * 12).toFixed(2)}s`);
  });
}

function buildHaze(card: Card) {
  const dots = card.dots;
  const sky = card.parts.sky;
  const ctx = sky.getContext("2d");
  if (!dots || !ctx) return;
  const rand = mulberry(card.seed * 131 + dots.columns);
  const pitch = dots.width / dots.columns;
  const boxWidth = dots.width + HAZE_X * 2;
  const boxHeight = HEIGHT + HAZE_TOP + HAZE_BOTTOM;
  sky.width = Math.round(boxWidth);
  sky.height = boxHeight;
  ctx.fillStyle = currentPaint().haze;
  dots.heights.forEach((level, column) => {
    const strength = 0.35 + (0.65 * (level - 1)) / (ROWS - 1);
    const x = HAZE_X + (column + 0.5) * pitch;
    const top = HAZE_TOP + ((ROWS - level + 0.5) * HEIGHT) / ROWS;
    ctx.globalAlpha = 0.1 * strength;
    ctx.fillRect(x - pitch / 2, top, pitch, boxHeight - top);
    ctx.globalAlpha = 0.34 * strength;
    ctx.beginPath();
    ctx.arc(x, top, 5, 0, TAU);
    ctx.fill();
  });
  sky.style.setProperty("--breath", `${(6 + rand() * 4).toFixed(2)}s`);
  placeBlobs(card, dots, rand);
  placeBokeh(card, dots, rand, boxHeight);
}

function assign(dots: Dots, index: number, cycle: number, seed: number) {
  const value = hash(index + seed * 1013, cycle);
  const pick = ((value >>> 16) & 0xff) / 256;
  const strength = (value >>> 24) / 256;
  dots.lastK[index] = cycle;
  dots.r1[index] = (value & 0xffff) / 65536;
  if (dots.kind[index] === 1) {
    const pop = pick >= 0.89;
    dots.pop[index] = pop ? 1 : 0;
    dots.peak[index] = pop ? 1 : 0.6 + strength * 0.4;
    dots.bucket[index] =
      pick < 0.24
        ? T1
        : pick < 0.58
          ? T2
          : pick < 0.75
            ? PEACH
            : pick < 0.89
              ? LILAC
              : pick < 0.96
                ? T3
                : T4;
    return;
  }
  const pop = pick >= 0.95;
  dots.pop[index] = pop ? 1 : 0;
  dots.peak[index] = pop ? 0.9 : 0.45 + strength * 0.4;
  dots.bucket[index] = pick < 0.34 ? LILAC : pick < 0.62 ? PEACH : pick < 0.95 ? T1 : T3;
}

function push(bucket: number, index: number, alpha: number) {
  if (alpha < 0.015) return;
  const used = fill[bucket] ?? 0;
  if (used >= MAX_SLOTS) return;
  const slot = slots[bucket];
  const level = alphas[bucket];
  if (!slot || !level) return;
  slot[used] = index;
  level[used] = alpha;
  fill[bucket] = used + 1;
}

function halo(x: number, y: number, radius: number, alpha: number) {
  if (alpha < 0.02 || haloCount >= MAX_HALOS) return;
  const at = haloCount * 4;
  haloData[at] = x;
  haloData[at + 1] = y;
  haloData[at + 2] = radius;
  haloData[at + 3] = alpha;
  haloCount += 1;
}

function envelope(progress: number) {
  if (progress < 0.2) return 1 - (1 - progress / 0.2) ** 3;
  return (1 - (progress - 0.2) / 0.8) ** 2;
}

function planBackground(card: Card, dots: Dots, index: number, wash: number, gain: number) {
  const time = card.clock;
  const chance = DENSITY * 2;
  if (gain > 0) {
    const turn = time / (dots.per[index] ?? 1) + (dots.ph[index] ?? 0);
    const cycle = Math.floor(turn);
    if (cycle !== dots.lastK[index]) assign(dots, index, cycle, card.seed);
    if ((dots.r1[index] ?? 1) < chance * (dots.weight[index] ?? 1)) {
      const progress = turn - cycle;
      if (progress > 0.1 && progress < 0.9) {
        const wave = Math.sin((Math.PI * (progress - 0.1)) / 0.8);
        const isPop = dots.pop[index] === 1;
        const bump = isPop ? wave * wave * wave * wave : wave * wave;
        const shimmer = 0.86 + 0.14 * Math.sin(time * 5.3 + (dots.ph[index] ?? 0) * 40);
        const glow = bump * (dots.peak[index] ?? 0) * shimmer * gain * 1.35;
        push(dots.bucket[index] ?? T1, index, glow);
        if (isPop) halo(dots.xs[index] ?? 0, dots.ys[index] ?? 0, 7, glow * 0.4);
      }
    }
  }
  if (wash > 0) push(T1, index, wash * 0.6 * gain);
}

function planLit(card: Card, dots: Dots, index: number, wash: number, gain: number) {
  const time = card.clock;
  const kind = dots.kind[index] ?? 3;
  const reach = kind === 3 ? 1 : kind === 2 ? 0.55 : 0.35;
  const swing =
    Math.sin(time * (dots.f1[index] ?? 1) + (dots.p1[index] ?? 0)) * 0.6 +
    Math.sin(time * (dots.f2[index] ?? 1) + (dots.p2[index] ?? 0)) * 0.4;
  const drift = kind === 4 ? Math.abs(swing) : swing;
  const level = drift * reach * gain + wash * 0.55 * gain;
  if (level < 0) push(DIM, index, -level * 0.62);
  else push(HOT, index, level * 0.6);
}

function planGlints(card: Card, dots: Dots, gain: number, frozen: boolean) {
  const time = card.clock;
  if (!frozen && time >= card.nextGlint) {
    const onLine = card.rand() < 0.4 && dots.tops.length > 0;
    const index = onLine
      ? (dots.tops[Math.floor(card.rand() * dots.tops.length)] ?? 0)
      : Math.floor(card.rand() * dots.count);
    card.glints.push({ index, start: time });
    card.nextGlint = time + ((0.3 + card.rand() * 0.9) * (32 / dots.columns)) / (0.5 + INTENSITY);
  }
  for (let g = card.glints.length - 1; g >= 0; g -= 1) {
    const glint = card.glints[g];
    if (!glint) continue;
    const progress = (time - glint.start) / 0.6;
    if (progress >= 1 || progress < 0) {
      card.glints.splice(g, 1);
      continue;
    }
    const strength = envelope(progress) * Math.min(1, gain * 1.4);
    push(HOT, glint.index, strength);
    halo(dots.xs[glint.index] ?? 0, dots.ys[glint.index] ?? 0, 9, strength * 0.7);
  }
}

function plan(card: Card, dots: Dots, gain: number, frozen: boolean) {
  const time = card.clock;
  const sigma = dots.width * 0.17;
  const margin = sigma * 2.4;
  const travel = dots.width + margin * 2;
  const lapA = fraction(time / card.washPeriod + card.washPhase);
  const lapB = fraction(time / (card.washPeriod * 1.9) + card.washPhase * 3);
  const forward = card.washDir > 0;
  const washA = forward ? lapA * travel - margin : dots.width + margin - lapA * travel;
  const washB = forward ? dots.width + margin - lapB * travel : lapB * travel - margin;

  for (let i = 0; i < dots.count; i += 1) {
    const x = dots.xs[i] ?? 0;
    const row = dots.row[i] ?? 0;
    let wash = 0;
    if (gain > 0) {
      const a = (x + (row - 2.5) * 5 - washA) / sigma;
      const b = (x - (row - 2.5) * 4 - washB) / (sigma * 0.6);
      wash = Math.exp(-a * a) * 0.9 + Math.exp(-b * b) * 0.45;
    }
    if ((dots.kind[i] ?? 0) < 2) planBackground(card, dots, i, wash, gain);
    else planLit(card, dots, i, wash, gain);
  }

  if (gain <= 0) return;
  if (dots.latest >= 0) {
    const pulse = 0.34 + 0.26 * Math.sin((time * TAU) / 3.4);
    halo(dots.xs[dots.latest] ?? 0, dots.ys[dots.latest] ?? 0, 11, pulse * gain * 1.15);
  }
  planGlints(card, dots, gain, frozen);
}

function drawHalos(ctx: CanvasRenderingContext2D) {
  const glow = currentSprite();
  for (let h = 0; h < haloCount; h += 1) {
    const at = h * 4;
    const radius = haloData[at + 2] ?? 0;
    ctx.globalAlpha = Math.min(1, haloData[at + 3] ?? 0);
    ctx.drawImage(
      glow,
      (haloData[at] ?? 0) - radius,
      (haloData[at + 1] ?? 0) - radius,
      radius * 2,
      radius * 2,
    );
  }
  ctx.globalAlpha = 1;
}

function drawBase(card: Card, dots: Dots, ctx: CanvasRenderingContext2D, colors: Paint) {
  for (let tone = 0; tone < dots.groups.length; tone += 1) {
    const group = dots.groups[tone];
    if (!group || group.length === 0) continue;
    ctx.fillStyle = tone === 0 && card.hover ? colors.hover : (colors.tones[tone] ?? "");
    ctx.beginPath();
    for (const i of group) {
      const x = dots.xs[i] ?? 0;
      ctx.moveTo(x + 1.5, dots.ys[i] ?? 0);
      ctx.arc(x, dots.ys[i] ?? 0, 1.5, 0, TAU);
    }
    ctx.fill();
  }
  if (dots.latest >= 0) {
    ctx.fillStyle = colors.tones[5] ?? "";
    ctx.beginPath();
    ctx.arc(dots.xs[dots.latest] ?? 0, dots.ys[dots.latest] ?? 0, 2.5, 0, TAU);
    ctx.fill();
  }
}

function drawOverlay(dots: Dots, ctx: CanvasRenderingContext2D, colors: Paint) {
  for (let bucket = 0; bucket < BUCKETS; bucket += 1) {
    const used = fill[bucket] ?? 0;
    const slot = slots[bucket];
    const level = alphas[bucket];
    if (used === 0 || !slot || !level) continue;
    ctx.fillStyle = colors.buckets[bucket] ?? "";
    for (let entry = 0; entry < used; entry += 1) {
      const i = slot[entry] ?? 0;
      ctx.globalAlpha = Math.min(1, level[entry] ?? 0);
      ctx.beginPath();
      ctx.arc(dots.xs[i] ?? 0, dots.ys[i] ?? 0, i === dots.latest ? 2.5 : 1.5, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function draw(card: Card, gain: number, frozen: boolean) {
  const dots = card.dots;
  if (!dots) return;
  const ctx = card.ctx;
  const scale = card.ratio;
  const colors = currentPaint();
  fill.fill(0);
  haloCount = 0;
  if (gain > 0) plan(card, dots, gain, frozen);
  ctx.setTransform(scale, 0, 0, scale, PAD * scale, PAD * scale);
  ctx.clearRect(-PAD, -PAD, dots.width + PAD * 2, HEIGHT + PAD * 2);
  drawHalos(ctx);
  drawBase(card, dots, ctx, colors);
  drawOverlay(dots, ctx, colors);
}

function isStill() {
  return motionQuery?.matches ?? false;
}

function frame(now: number) {
  pending = 0;
  const delta = Math.min(0.1, (now - previous) / 1000);
  previous = now;
  const still = isStill();
  cards.forEach((card) => {
    if (!card.dots) return;
    const frozen = still || card.hover || !card.visible;
    if (!frozen) card.clock += delta;
    if (frozen && !card.dirty) return;
    const settle = clamp((now - card.bornAt - REVEAL) / 900);
    const ramp = 1 - (1 - settle) ** 3;
    draw(card, still ? 0 : INTENSITY * ramp, frozen);
    card.dirty = false;
  });
  if (!still) wake();
}

function wake() {
  if (pending || document.hidden || cards.size === 0) return;
  pending = requestAnimationFrame(frame);
}

function refreshAll() {
  paint = null;
  sprite = null;
  cards.forEach((card) => {
    buildHaze(card);
    card.dirty = true;
  });
  wake();
}

function onVisibility() {
  if (document.hidden) {
    cancelAnimationFrame(pending);
    pending = 0;
    return;
  }
  previous = performance.now();
  wake();
}

function startWatching() {
  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  motionQuery.addEventListener("change", refreshAll);
  document.addEventListener("visibilitychange", onVisibility);
  themeWatch = new MutationObserver(refreshAll);
  themeWatch.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class"],
  });
  previous = performance.now();
}

function stopWatching() {
  cancelAnimationFrame(pending);
  pending = 0;
  motionQuery?.removeEventListener("change", refreshAll);
  document.removeEventListener("visibilitychange", onVisibility);
  themeWatch?.disconnect();
  themeWatch = null;
  motionQuery = null;
}

function createCard(parts: SparkleParts, values: number[]): Card | null {
  const ctx = parts.canvas.getContext("2d");
  if (!ctx) return null;
  const seed = seedOf(values);
  const seedRand = mulberry(seed * 31 + 7);
  return {
    parts,
    ctx,
    values,
    seed,
    rand: mulberry(seed * 97 + 3),
    washPeriod: 9 + seedRand() * 8,
    washPhase: seedRand(),
    washDir: seedRand() < 0.5 ? 1 : -1,
    clock: seedRand() * 40,
    bornAt: performance.now(),
    nextGlint: 0,
    glints: [],
    ratio: 1,
    hover: false,
    visible: true,
    dirty: true,
    dots: null,
  };
}

function attach(card: Card) {
  const parts = card.parts;
  const resize = new ResizeObserver(() => {
    if (card.dots?.width !== parts.spark.clientWidth) build(card);
    wake();
  });
  const sight = new IntersectionObserver((entries) => {
    for (const entry of entries) card.visible = entry.isIntersecting;
    wake();
  });
  function enter() {
    card.hover = true;
    card.dirty = true;
    wake();
  }
  function leave() {
    card.hover = false;
    card.dirty = true;
    wake();
  }
  if (cards.size === 0) startWatching();
  cards.add(card);
  resize.observe(parts.spark);
  sight.observe(parts.host);
  parts.host.addEventListener("pointerenter", enter);
  parts.host.addEventListener("pointerleave", leave);
  build(card);
  wake();
  return () => {
    resize.disconnect();
    sight.disconnect();
    parts.host.removeEventListener("pointerenter", enter);
    parts.host.removeEventListener("pointerleave", leave);
    cards.delete(card);
    if (cards.size === 0) stopWatching();
  };
}

/**
 * @name mountSparkle
 * @description Draws the dot-matrix sparkline for a series on a canvas and keeps it
 * twinkling: lit dots drift, background dots glow like distant windows, a wash and
 * glints move across, and a haze breathes behind it. Cards share one animation loop
 * that pauses on hover, off screen, in a hidden tab and under reduced motion.
 *
 * @example
 * const stop = mountSparkle(parts, points.map((point) => point.value));
 * stop();
 */
export function mountSparkle(parts: SparkleParts, values: number[]) {
  const card = createCard(parts, values);
  return card ? attach(card) : noop;
}
