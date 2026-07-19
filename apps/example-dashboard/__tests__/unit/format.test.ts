import { describe, expect, test } from "bun:test";
import { formatNumber, getFlagEmoji } from "../../lib/format";

describe("formatNumber", function () {
	test("keeps values below one thousand readable", function () {
		expect(formatNumber(999)).toBe("999");
	});

	test("formats thousands", function () {
		expect(formatNumber(1_000)).toBe("1.0K");
		expect(formatNumber(12_500)).toBe("12.5K");
	});

	test("formats millions", function () {
		expect(formatNumber(1_000_000)).toBe("1.0M");
		expect(formatNumber(2_750_000)).toBe("2.8M");
	});
});

describe("getFlagEmoji", function () {
	test("converts ISO codes case insensitively", function () {
		expect(getFlagEmoji("nl")).toBe("🇳🇱");
	});

	test("rejects missing and malformed codes", function () {
		expect(getFlagEmoji("")).toBe("");
		expect(getFlagEmoji("NLD")).toBe("");
	});
});
