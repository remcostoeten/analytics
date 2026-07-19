export const COUNTRY_NAME_TO_ISO: Record<string, string> = {
	"United States": "US",
	Netherlands: "NL",
	"United Kingdom": "GB",
	Germany: "DE",
	France: "FR",
	Canada: "CA",
	Australia: "AU",
	Japan: "JP",
	Brazil: "BR",
	India: "IN",
	China: "CN",
	Spain: "ES",
	Italy: "IT",
};

const countryDisplay = new Intl.DisplayNames(["en"], { type: "region" });

/**
 * Events store a mix of ISO codes (edge headers, e.g. "NL") and full names
 * (legacy/seed rows, e.g. "Netherlands"). These helpers normalize either
 * form to a canonical ISO code and a display name.
 */
export function toCountryCode(value: string | null | undefined): string | null {
	if (!value) return null;
	if (/^[A-Za-z]{2}$/.test(value)) return value.toUpperCase();
	return COUNTRY_NAME_TO_ISO[value] ?? null;
}

export function countryName(value: string | null | undefined): string {
	if (!value) return "Unknown";
	const code = toCountryCode(value);
	if (!code) return value;
	try {
		return countryDisplay.of(code) ?? value;
	} catch {
		return value;
	}
}

export function countryFilterValues(code: string): string[] {
	const values = [code];
	const name = countryName(code);
	if (name !== code) values.push(name);
	return values;
}

const SUBDIVISION_NAMES: Record<string, Record<string, string>> = {
	NL: {
		DR: "Drenthe",
		FL: "Flevoland",
		FR: "Friesland",
		GE: "Gelderland",
		GR: "Groningen",
		LI: "Limburg",
		NB: "Noord-Brabant",
		NH: "Noord-Holland",
		OV: "Overijssel",
		UT: "Utrecht",
		ZE: "Zeeland",
		ZH: "Zuid-Holland",
	},
	BE: {
		VAN: "Antwerp",
		VBR: "Flemish Brabant",
		VLI: "Limburg",
		VOV: "East Flanders",
		VWV: "West Flanders",
		WBR: "Walloon Brabant",
		WHT: "Hainaut",
		WLG: "Liège",
		WLX: "Luxembourg",
		WNA: "Namur",
		BRU: "Brussels",
	},
	DE: {
		BW: "Baden-Württemberg",
		BY: "Bavaria",
		BE: "Berlin",
		BB: "Brandenburg",
		HB: "Bremen",
		HH: "Hamburg",
		HE: "Hesse",
		MV: "Mecklenburg-Vorpommern",
		NI: "Lower Saxony",
		NW: "North Rhine-Westphalia",
		RP: "Rhineland-Palatinate",
		SL: "Saarland",
		SN: "Saxony",
		ST: "Saxony-Anhalt",
		SH: "Schleswig-Holstein",
		TH: "Thuringia",
	},
	GB: {
		ENG: "England",
		SCT: "Scotland",
		WLS: "Wales",
		NIR: "Northern Ireland",
	},
	US: {
		AL: "Alabama",
		AK: "Alaska",
		AZ: "Arizona",
		AR: "Arkansas",
		CA: "California",
		CO: "Colorado",
		CT: "Connecticut",
		DE: "Delaware",
		DC: "Washington D.C.",
		FL: "Florida",
		GA: "Georgia",
		HI: "Hawaii",
		ID: "Idaho",
		IL: "Illinois",
		IN: "Indiana",
		IA: "Iowa",
		KS: "Kansas",
		KY: "Kentucky",
		LA: "Louisiana",
		ME: "Maine",
		MD: "Maryland",
		MA: "Massachusetts",
		MI: "Michigan",
		MN: "Minnesota",
		MS: "Mississippi",
		MO: "Missouri",
		MT: "Montana",
		NE: "Nebraska",
		NV: "Nevada",
		NH: "New Hampshire",
		NJ: "New Jersey",
		NM: "New Mexico",
		NY: "New York",
		NC: "North Carolina",
		ND: "North Dakota",
		OH: "Ohio",
		OK: "Oklahoma",
		OR: "Oregon",
		PA: "Pennsylvania",
		RI: "Rhode Island",
		SC: "South Carolina",
		SD: "South Dakota",
		TN: "Tennessee",
		TX: "Texas",
		UT: "Utah",
		VT: "Vermont",
		VA: "Virginia",
		WA: "Washington",
		WV: "West Virginia",
		WI: "Wisconsin",
		WY: "Wyoming",
	},
};

export function regionName(countryCode: string | null, region: string | null | undefined): string {
	if (!region) return "Unknown";
	if (!countryCode) return region;
	return SUBDIVISION_NAMES[countryCode.toUpperCase()]?.[region.toUpperCase()] ?? region;
}

const TIMEZONE_COUNTRIES: Record<string, string> = {
	"Europe/Amsterdam": "NL",
	"Europe/Brussels": "BE",
	"Europe/Berlin": "DE",
	"Europe/Paris": "FR",
	"Europe/London": "GB",
	"Europe/Dublin": "IE",
	"Europe/Madrid": "ES",
	"Europe/Lisbon": "PT",
	"Europe/Rome": "IT",
	"Europe/Vienna": "AT",
	"Europe/Zurich": "CH",
	"Europe/Copenhagen": "DK",
	"Europe/Stockholm": "SE",
	"Europe/Oslo": "NO",
	"Europe/Helsinki": "FI",
	"Europe/Warsaw": "PL",
	"Europe/Prague": "CZ",
	"Europe/Budapest": "HU",
	"Europe/Bucharest": "RO",
	"Europe/Sofia": "BG",
	"Europe/Athens": "GR",
	"Europe/Istanbul": "TR",
	"Europe/Kyiv": "UA",
	"Europe/Moscow": "RU",
	"Europe/Luxembourg": "LU",
	"America/New_York": "US",
	"America/Chicago": "US",
	"America/Denver": "US",
	"America/Phoenix": "US",
	"America/Los_Angeles": "US",
	"America/Anchorage": "US",
	"Pacific/Honolulu": "US",
	"America/Toronto": "CA",
	"America/Vancouver": "CA",
	"America/Edmonton": "CA",
	"America/Winnipeg": "CA",
	"America/Halifax": "CA",
	"America/Mexico_City": "MX",
	"America/Sao_Paulo": "BR",
	"America/Argentina/Buenos_Aires": "AR",
	"America/Santiago": "CL",
	"America/Bogota": "CO",
	"America/Lima": "PE",
	"Asia/Tokyo": "JP",
	"Asia/Seoul": "KR",
	"Asia/Shanghai": "CN",
	"Asia/Hong_Kong": "HK",
	"Asia/Taipei": "TW",
	"Asia/Singapore": "SG",
	"Asia/Bangkok": "TH",
	"Asia/Jakarta": "ID",
	"Asia/Manila": "PH",
	"Asia/Kuala_Lumpur": "MY",
	"Asia/Kolkata": "IN",
	"Asia/Karachi": "PK",
	"Asia/Dhaka": "BD",
	"Asia/Dubai": "AE",
	"Asia/Riyadh": "SA",
	"Asia/Jerusalem": "IL",
	"Africa/Cairo": "EG",
	"Africa/Lagos": "NG",
	"Africa/Nairobi": "KE",
	"Africa/Johannesburg": "ZA",
	"Africa/Casablanca": "MA",
	"Australia/Sydney": "AU",
	"Australia/Melbourne": "AU",
	"Australia/Brisbane": "AU",
	"Australia/Perth": "AU",
	"Australia/Adelaide": "AU",
	"Pacific/Auckland": "NZ",
};

export function countryFromTimezone(timezone: string | null | undefined): string | null {
	if (!timezone) return null;
	return TIMEZONE_COUNTRIES[timezone] ?? null;
}
