import { describe, test, expect } from "bun:test";
import { hasMethods } from "../src/utilities";

describe("hasMethods", () => {
	test("accepts a module exposing every required method", () => {
		expect(hasMethods({ track: function track() {} }, ["track"])).toBe(true);
	});

	test("rejects a module missing a required method", () => {
		expect(hasMethods({ capture: function capture() {} }, ["track"])).toBe(false);
	});

	test("rejects a method that is not callable", () => {
		expect(hasMethods({ track: "nope" }, ["track"])).toBe(false);
	});

	test("rejects absent and non object modules", () => {
		expect(hasMethods(null, ["track"])).toBe(false);
		expect(hasMethods(undefined, ["track"])).toBe(false);
		expect(hasMethods("posthog", ["track"])).toBe(false);
	});
});
