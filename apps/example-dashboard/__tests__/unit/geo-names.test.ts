import { describe, expect, test } from "bun:test";
import {
	countryFilterValues,
	countryFromTimezone,
	countryName,
	regionName,
	toCountryCode,
} from "@/lib/geo-names";

describe("country names", function () {
	test("normalizes codes and known names", function () {
		expect(toCountryCode("nl")).toBe("NL");
		expect(toCountryCode("Netherlands")).toBe("NL");
	});

	test("handles missing and unknown values", function () {
		expect(toCountryCode(undefined)).toBeNull();
		expect(toCountryCode("Atlantis")).toBeNull();
		expect(countryName(null)).toBe("Unknown");
		expect(countryName("Atlantis")).toBe("Atlantis");
	});

	test("builds query values from country codes", function () {
		expect(countryFilterValues("NL")).toEqual(["NL", "Netherlands"]);
	});
});

describe("region names", function () {
	test("resolves known subdivisions case insensitively", function () {
		expect(regionName("nl", "nh")).toBe("Noord-Holland");
		expect(regionName("US", "ca")).toBe("California");
	});

	test("preserves unknown subdivisions", function () {
		expect(regionName("NL", "XX")).toBe("XX");
		expect(regionName(null, "Somewhere")).toBe("Somewhere");
		expect(regionName("NL", null)).toBe("Unknown");
	});
});

describe("countryFromTimezone", function () {
	test("maps supported timezones", function () {
		expect(countryFromTimezone("Europe/Amsterdam")).toBe("NL");
		expect(countryFromTimezone("America/New_York")).toBe("US");
	});

	test("returns null for missing and unknown timezones", function () {
		expect(countryFromTimezone(undefined)).toBeNull();
		expect(countryFromTimezone("Mars/Olympus")).toBeNull();
	});
});
