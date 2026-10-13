import {
  ACESFilmicToneMapping,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  OrthographicCamera,
  PMREMGenerator,
  Scene,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Nullable } from "@spoar/shared/semantic";

import type { DropAppearance } from "./drop-appearance";
import { createDropGeometry } from "./drop-geometry";
import { resolveDropShape, type DropShape } from "./drop-shape";

export type DropImageExporter = () => Promise<Nullable<Blob>>;

type DropSceneOptions = {
  scrollDriven?: boolean;
};

function easeScrollRotation(progress: number) {
  if (progress <= 0 || progress >= 1) return progress;
  let lower = 0;
  let upper = 1;
  for (let step = 0; step < 16; step++) {
    const t = (lower + upper) / 2;
    const x = 3 * (1 - t) ** 2 * t * 0.23 + 3 * (1 - t) * t ** 2 * 0.32 + t ** 3;
    if (x < progress) lower = t;
    else upper = t;
  }
  return 1 - (1 - (lower + upper) / 2) ** 3;
}

function createColoredGeometry(shape?: Partial<DropShape>) {
  const geometry = createDropGeometry(shape);
  geometry.setAttribute(
    "color",
    new Float32BufferAttribute(
      new Float32Array(geometry.getAttribute("position").count * 3).fill(1),
      3,
    ),
  );
  return geometry;
}

function createReflectionGeometry(geometry: ReturnType<typeof createDropGeometry>) {
  const reflection = geometry.clone();
  const positions = reflection.getAttribute("position");
  const colors: number[] = [];
  for (let index = 0; index < positions.count; index++) {
    const distance = Math.min(1, Math.max(0, (positions.getY(index) + 1.35) / 2.7));
    colors.push(1, 1, 1, (1 - distance) ** 2);
  }
  reflection.setAttribute("color", new Float32BufferAttribute(colors, 4));
  return reflection;
}

/**
 * @name createDropScene
 * @description Renders the rotating metal drop and owns its GPU resource cleanup.
 * @example const scene = createDropScene(canvas); scene.setActive(true);
 */
export function createDropScene(
  canvas: HTMLCanvasElement,
  { scrollDriven = false }: DropSceneOptions = {},
) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  const studio = new RoomEnvironment();
  const generator = new PMREMGenerator(renderer);
  const environment = generator.fromScene(studio, 0.04);
  studio.dispose();
  generator.dispose();

  const scene = new Scene();
  scene.environment = environment.texture;
  const camera = new OrthographicCamera(-1.8, 1.8, 1.65, -1.95, 0.1, 20);
  camera.position.set(0, 0, 6);
  let geometry = createColoredGeometry();
  let currentShape = resolveDropShape();
  const material = new MeshPhysicalMaterial({
    color: new Color("#cbc1e5"),
    vertexColors: true,
    metalness: 1,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.5,
  });
  const drop = new Mesh(geometry, material);
  drop.rotation.set(0.06, 0.2, -0.04);
  scene.add(drop);

  let reflectionGeometry = createReflectionGeometry(geometry);
  const reflectionMaterial = material.clone();
  reflectionMaterial.vertexColors = true;
  reflectionMaterial.transparent = true;
  reflectionMaterial.opacity = 0.24;
  reflectionMaterial.depthWrite = false;
  reflectionMaterial.roughness = 0.38;
  reflectionMaterial.clearcoat = 0;
  const reflection = new Mesh(reflectionGeometry, reflectionMaterial);
  const reflectionPlane = new Group();
  reflectionPlane.position.y = -1.68;
  reflectionPlane.scale.y = -0.22;
  reflectionPlane.add(reflection);
  scene.add(reflectionPlane);
  if (scrollDriven) {
    reflectionPlane.visible = false;
    camera.top = 1.8;
    camera.bottom = -1.8;
    camera.updateProjectionMatrix();
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let active = false;
  let rotating = true;
  let previousTime = 0;
  let targetRotation = 0.2 + (Math.max(0, window.scrollY) / 1200) * Math.PI * 2;
  let scrolling = false;
  let scrollStartedAt = 0;
  let startRotation = drop.rotation.y;

  function animateScroll(time: number) {
    const progress = Math.min(1, Math.max(0, (time - scrollStartedAt) / 450));
    drop.rotation.y =
      startRotation + (targetRotation - startRotation) * easeScrollRotation(progress);
    if (progress === 1) {
      drop.rotation.y = targetRotation;
      scrolling = false;
      renderer.setAnimationLoop(null);
    }
    render();
  }

  function handleScroll() {
    targetRotation = 0.2 + (Math.max(0, window.scrollY) / 1200) * Math.PI * 2;
    if (!active || reducedMotion.matches) return;
    startRotation = drop.rotation.y;
    scrollStartedAt = performance.now();
    if (scrolling) return;
    scrolling = true;
    renderer.setAnimationLoop(animateScroll);
  }

  function render() {
    reflection.rotation.copy(drop.rotation);
    renderer.render(scene, camera);
  }

  function sync() {
    previousTime = 0;
    if (scrollDriven) {
      renderer.setAnimationLoop(null);
      scrolling = false;
      drop.rotation.y = reducedMotion.matches ? 0.2 : targetRotation;
      render();
      if (active) handleScroll();
      return;
    }
    renderer.setAnimationLoop(
      active && rotating && !reducedMotion.matches
        ? (time) => {
            if (previousTime !== 0) {
              drop.rotation.y += ((time - previousTime) / 16000) * Math.PI * 2;
            }
            previousTime = time;
            render();
          }
        : null,
    );
    if (reducedMotion.matches || !rotating) drop.rotation.y = 0.2;
    render();
  }

  function setAppearance({
    color = "#cbc1e5",
    palette,
    metalness = 1,
    roughness = 0.2,
    clearcoat = 1,
  }: DropAppearance) {
    const base = new Color(color);
    const shadow = new Color(palette?.shadow ?? color);
    const midtone = new Color(palette?.midtone ?? color);
    const highlight = new Color(palette?.highlight ?? color);
    const strength = Math.min(1, Math.max(0, (palette?.amount ?? 0) / 100));
    const tint = new Color();
    const surfaceColors = geometry.getAttribute("color");
    const reflectedColors = reflectionGeometry.getAttribute("color");
    const positions = geometry.getAttribute("position");

    for (let index = 0; index < positions.count; index++) {
      const height = Math.min(1, Math.max(0, (positions.getY(index) + 1.35) / 2.7));
      if (height < 0.5) tint.copy(shadow).lerp(midtone, height * 2);
      else tint.copy(midtone).lerp(highlight, (height - 0.5) * 2);
      tint.lerp(base, 1 - strength);
      surfaceColors.setXYZ(index, tint.r, tint.g, tint.b);
      reflectedColors.setXYZ(index, tint.r, tint.g, tint.b);
    }

    surfaceColors.needsUpdate = true;
    reflectedColors.needsUpdate = true;
    material.color.set("#ffffff");
    material.metalness = Math.min(1, Math.max(0, metalness));
    material.roughness = Math.min(1, Math.max(0, roughness));
    material.clearcoat = Math.min(1, Math.max(0, clearcoat));
    reflectionMaterial.color.set("#ffffff");
    reflectionMaterial.metalness = material.metalness;
    reflectionMaterial.roughness = Math.min(1, material.roughness + 0.18);
    render();
  }

  const resizeObserver = new ResizeObserver(() => {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    render();
  });
  resizeObserver.observe(canvas);
  reducedMotion.addEventListener("change", sync);
  if (scrollDriven) window.addEventListener("scroll", handleScroll, { passive: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  render();

  return {
    setAppearance,
    exportPng(this: void): Promise<Nullable<Blob>> {
      const pixelRatio = renderer.getPixelRatio();
      renderer.setPixelRatio(1);
      renderer.setSize(1024, 1024, false);
      reflection.visible = false;
      render();
      const image = new Promise<Nullable<Blob>>((resolve) => canvas.toBlob(resolve, "image/png"));
      reflection.visible = true;
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      render();
      return image;
    },
    setShape(input?: Partial<DropShape>) {
      const shape = resolveDropShape(input);
      if (JSON.stringify(shape) === JSON.stringify(currentShape)) return;
      currentShape = shape;
      const next = createColoredGeometry(shape);
      const nextReflection = createReflectionGeometry(next);
      geometry.dispose();
      reflectionGeometry.dispose();
      geometry = next;
      reflectionGeometry = nextReflection;
      drop.geometry = geometry;
      reflection.geometry = reflectionGeometry;
    },
    setRotating(value: boolean) {
      if (rotating === value) return;
      rotating = value;
      sync();
    },
    setActive(visible: boolean) {
      if (active === visible) return;
      active = visible;
      sync();
    },
    dispose() {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      reducedMotion.removeEventListener("change", sync);
      if (scrollDriven) window.removeEventListener("scroll", handleScroll);
      geometry.dispose();
      material.dispose();
      reflectionGeometry.dispose();
      reflectionMaterial.dispose();
      environment.dispose();
      renderer.dispose();
    },
  };
}
