import { describe, it, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { observeClicks } from "../src/observers/click";
import * as trackModule from "../src/api/track";

describe("click tracking", () => {
	let trackClickSpy: ReturnType<typeof spyOn>;
	let listeners: Record<string, Function[]> = {};

	beforeEach(() => {
		trackClickSpy = spyOn(trackModule, "trackClick");
		listeners = {};

		(global as any).document = {
			addEventListener: (type: string, cb: Function) => {
				listeners[type] = listeners[type] || [];
				listeners[type].push(cb);
			},
			removeEventListener: (type: string, cb: Function) => {
				listeners[type] = (listeners[type] || []).filter((f) => f !== cb);
			},
		};

		(global as any).MouseEvent = class {
			constructor(
				public type: string,
				public init: { target?: unknown } = {},
			) {}

			get target() {
				return this.init.target;
			}
		};

		(global as any).Element = class {};
	});

	afterEach(() => {
		trackClickSpy.mockRestore();
	});

	it("tracks clicks on elements with data-analytics", () => {
		const button = {
			getAttribute(attr: string) {
				if (attr === "data-analytics") return "signup";
				return null;
			},
			closest(selector: string) {
				if (selector === "[data-analytics]") return this;
				return null;
			},
		};

		Object.setPrototypeOf(button, (global as any).Element.prototype);

		const cleanup = observeClicks({ projectId: "my-app" });
		const handler = listeners.click[0];
		handler(new (global as any).MouseEvent("click", { target: button }));

		expect(trackClickSpy).toHaveBeenCalledWith("signup", undefined, { projectId: "my-app" });
		cleanup();
	});

	it("parses data-analytics-meta JSON", () => {
		const link = {
			getAttribute(attr: string) {
				if (attr === "data-analytics") return "cta";
				if (attr === "data-analytics-meta") return '{"plan":"pro"}';
				return null;
			},
			closest(selector: string) {
				if (selector === "[data-analytics]") return this;
				return null;
			},
		};

		Object.setPrototypeOf(link, (global as any).Element.prototype);

		const cleanup = observeClicks();
		listeners.click[0](new (global as any).MouseEvent("click", { target: link }));

		expect(trackClickSpy).toHaveBeenCalledWith("cta", { plan: "pro" }, {});
		cleanup();
	});

	it("ignores malformed data-analytics-meta", () => {
		const link = {
			getAttribute(attr: string) {
				if (attr === "data-analytics") return "cta";
				if (attr === "data-analytics-meta") return "{bad json";
				return null;
			},
			closest(selector: string) {
				if (selector === "[data-analytics]") return this;
				return null;
			},
		};

		Object.setPrototypeOf(link, (global as any).Element.prototype);

		const cleanup = observeClicks();
		listeners.click[0](new (global as any).MouseEvent("click", { target: link }));

		expect(trackClickSpy).toHaveBeenCalledWith("cta", undefined, {});
		cleanup();
	});

	it("finds data-analytics on ancestor elements", () => {
		const parent = {
			getAttribute(attr: string) {
				if (attr === "data-analytics") return "wrapper";
				return null;
			},
			closest(selector: string) {
				if (selector === "[data-analytics]") return this;
				return null;
			},
		};

		Object.setPrototypeOf(parent, (global as any).Element.prototype);

		const child = {
			closest(selector: string) {
				if (selector === "[data-analytics]") return parent;
				return null;
			},
		};

		Object.setPrototypeOf(child, (global as any).Element.prototype);

		const cleanup = observeClicks();
		listeners.click[0](new (global as any).MouseEvent("click", { target: child }));

		expect(trackClickSpy).toHaveBeenCalledWith("wrapper", undefined, {});
		cleanup();
	});

	it("ignores clicks without data-analytics", () => {
		const div = {
			closest() {
				return null;
			},
		};

		Object.setPrototypeOf(div, (global as any).Element.prototype);

		const cleanup = observeClicks();
		listeners.click[0](new (global as any).MouseEvent("click", { target: div }));

		expect(trackClickSpy).not.toHaveBeenCalled();
		cleanup();
	});
});
