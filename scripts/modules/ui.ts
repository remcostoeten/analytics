export const colors = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	green: "\x1b[32m",
	cyan: "\x1b[36m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	red: "\x1b[31m",
};

export function pad(str: string, length: number): string {
	return str + " ".repeat(Math.max(0, length - str.length));
}

export function header(text: string) {
	console.log("\n" + colors.cyan + "═".repeat(60) + colors.reset);
	console.log(colors.cyan + `  ${colors.bold}${text}` + colors.reset);
	console.log(colors.cyan + "═".repeat(60) + colors.reset + "\n");
}

export async function prompt(question: string): Promise<string> {
	process.stdout.write(colors.yellow + question + colors.reset);
	return new Promise((resolve) => {
		process.stdin.once("data", (data) => {
			resolve(data.toString().trim());
		});
	});
}

export function colorizeJson(json: unknown): string {
	const str = typeof json === "string" ? json : JSON.stringify(json, null, 2);
	return str.replace(
		/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
		function (match) {
			if (match.startsWith('"')) {
				if (match.endsWith(":")) {
					return colors.cyan + match.slice(0, -1) + colors.reset + ":";
				}
				return colors.green + match + colors.reset;
			}
			if (/true|false/.test(match)) return colors.magenta + match + colors.reset;
			if (/null/.test(match)) return colors.dim + match + colors.reset;
			return colors.yellow + match + colors.reset;
		},
	);
}
