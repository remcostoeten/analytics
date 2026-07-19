import { describe, expect, test } from "bun:test";
import { calculateTrend, getPreviousRange, getRange } from "../../lib/queries/filters";

describe("query ranges", function () {
	test("preserves explicit ranges", function () {
		const from = new Date("2026-01-01T00:00:00.000Z");
		const to = new Date("2026-01-02T00:00:00.000Z");

		expect(getRange(from, to)).toEqual({ from, to });
	});

	test("creates an equally sized previous range", function () {
		const from = new Date("2026-01-02T00:00:00.000Z");
		const to = new Date("2026-01-04T00:00:00.000Z");

		expect(getPreviousRange({ from, to })).toEqual({
			from: new Date("2025-12-31T00:00:00.000Z"),
			to: from,
		});
	});
});

describe("calculateTrend", function () {
	test("marks first activity as new", function () {
		expect(calculateTrend(5, 0)).toEqual({
			value: 0,
			direction: "new",
			isPositive: true,
		});
	});

	test("marks no activity as flat", function () {
		expect(calculateTrend(0, 0)).toEqual({
			value: 0,
			direction: "flat",
			isPositive: true,
		});
	});

	test("calculates upward and downward changes", function () {
		expect(calculateTrend(15, 10)).toEqual({
			value: 50,
			direction: "up",
			isPositive: true,
		});
		expect(calculateTrend(5, 10)).toEqual({
			value: 50,
			direction: "down",
			isPositive: false,
		});
	});
});
