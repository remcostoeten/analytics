import { expect, test, type Page } from "@playwright/test";
import { instant } from "@next/playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

type Rect = {
	selector: string;
	x: number;
	y: number;
	width: number;
	height: number;
};

const routes = ["/", "/geo"];
const selectors = ["main", "header"];
const viewports = [
	{ name: "desktop", width: 1280, height: 720 },
	{ name: "mobile", width: 375, height: 812 },
];

async function getRects(page: Page): Promise<Rect[]> {
	return page.evaluate(function (items: string[]) {
		return items.map(function (selector) {
			const rect = document.querySelector(selector)?.getBoundingClientRect();
			if (!rect) {
				return { selector, x: 0, y: 0, width: 0, height: 0 };
			}
			return {
				selector,
				x: Math.round(rect.x),
				y: Math.round(rect.y),
				width: Math.round(rect.width),
				height: Math.round(rect.height),
			};
		});
	}, selectors);
}

function getDiff(loaded: Buffer, skeleton: Buffer): number {
	const loadedPng = PNG.sync.read(loaded);
	const skeletonPng = PNG.sync.read(skeleton);
	const diff = new PNG({ width: loadedPng.width, height: loadedPng.height });
	const pixels = pixelmatch(
		loadedPng.data,
		skeletonPng.data,
		diff.data,
		loadedPng.width,
		loadedPng.height,
		{ threshold: 0.1 },
	);
	return pixels / (loadedPng.width * loadedPng.height);
}

for (const viewport of viewports) {
	for (const route of routes) {
		test(`${route} keeps landmarks stable while streaming on ${viewport.name}`, async function ({
			page,
			baseURL,
		}, testInfo) {
			await page.setViewportSize(viewport);
			await page.goto(route, { waitUntil: "networkidle" });
			const loaded = await page.screenshot();
			const loadedRects = await getRects(page);

			let skeleton: Buffer | undefined;
			let skeletonRects: Rect[] | undefined;

			await instant(
				page,
				async function () {
					await page.goto(route);
					await page.waitForTimeout(100);
					skeleton = await page.screenshot();
					skeletonRects = await getRects(page);
				},
				{ baseURL },
			);

			expect(skeleton).toBeDefined();
			expect(skeletonRects).toBeDefined();

			const diff = getDiff(loaded, skeleton!);
			await testInfo.attach("skeleton", { body: skeleton!, contentType: "image/png" });
			await testInfo.attach("loaded", { body: loaded, contentType: "image/png" });
			console.log(
				JSON.stringify({ route, viewport: viewport.name, diff, skeletonRects, loadedRects }),
			);

			for (const rect of skeletonRects!) {
				const loadedRect = loadedRects.find(function (item) {
					return item.selector === rect.selector;
				});
				expect(loadedRect, `${route} is missing ${rect.selector} after streaming`).toBeDefined();
				expect(Math.abs(rect.x - loadedRect!.x)).toBeLessThanOrEqual(2);
				expect(Math.abs(rect.y - loadedRect!.y)).toBeLessThanOrEqual(2);
				expect(Math.abs(rect.width - loadedRect!.width)).toBeLessThanOrEqual(2);
				expect(Math.abs(rect.height - loadedRect!.height)).toBeLessThanOrEqual(2);
			}

			expect(diff).toBeLessThan(0.15);
		});
	}
}
