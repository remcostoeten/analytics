import app from "./app.js";
import { serve } from "bun";

const colors = {
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

let baseUrl = "";
let server = null;

function pad(str: string, length: number): string {
    return str + " ".repeat(Math.max(0, length - str.length));
}

function open(url: string) {
	const platform = process.platform;
    console.log(`\n  ${colors.dim}Opening ${url} in browser...${colors.reset}`);

	if (platform === "darwin") {
		Bun.spawn(["open", url]);
		return;
	}

	if (platform === "win32") {
		Bun.spawn(["cmd", "/c", "start", url]);
		return;
	}

	Bun.spawn(["xdg-open", url]);
}

function runCommand(name: string, args: string[]) {
    console.log(`\n  ${colors.cyan}▶ Running: ${colors.bold}${args.join(" ")}${colors.reset}\n`);
    const proc = Bun.spawn(args, {
		stdout: "inherit",
		stderr: "inherit",
	});

	proc.exited.then(function (code) {
        const color = code === 0 ? colors.green : colors.red;
        console.log(`\n  ${color}⏹ Process exited with code ${code}${colors.reset}`);
		prompt();
	});
}

function colorizeJson(json: unknown): string {
    const str = typeof json === "string" ? json : JSON.stringify(json, null, 2);
    // Extremely basic coloring for JSON strings in terminal
    return str.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, function (match) {
        if (match.startsWith('"')) {
            if (match.endsWith(":")) {
                return colors.cyan + match.slice(0, -1) + colors.reset + ":";
            }
            return colors.green + match + colors.reset;
        }
        if (/true|false/.test(match)) return colors.magenta + match + colors.reset;
        if (/null/.test(match)) return colors.dim + match + colors.reset;
        return colors.yellow + match + colors.reset;
    });
}

function request(path: string) {
	const start = performance.now();
    console.log(`\n  ${colors.blue}➜ GET ${colors.bold}${baseUrl}${path}${colors.reset}`);

	fetch(baseUrl + path)
		.then(async function (res) {
            const end = performance.now();
            const time = (end - start).toFixed(2);
			const type = res.headers.get("content-type") || "";
            const statusColor = res.ok ? colors.green : colors.red;
            
            console.log(`  ${statusColor}◄ ${res.status} ${res.statusText} ${colors.dim}(${time}ms)${colors.reset}\n`);

			if (type.includes("application/json")) {
				const data = await res.json();
                console.log(colorizeJson(data).split("\n").map(l => `    ${l}`).join("\n"));
			} else {
                const data = await res.text();
                console.log(`    ${colors.dim}${data}${colors.reset}`);
            }

			prompt();
		})
		.catch(function (err) {
            const end = performance.now();
            const time = (end - start).toFixed(2);
            console.log(`  ${colors.red}◄ ERROR ${colors.dim}(${time}ms)${colors.reset}\n`);
			console.log(`    ${colors.red}${err.message}${colors.reset}`);
			prompt();
		});
}

function clear() {
	header();
	prompt();
}

function info() {
    console.log(`\n  ${colors.bold}Server Information${colors.reset}`);
    console.log(`  ${colors.dim}─${colors.reset}`.repeat(40));
    console.log(`  ${pad("Base URL:", 15)} ${colors.green}${baseUrl}${colors.reset}`);
    console.log(`  ${pad("Process ID:", 15)} ${colors.cyan}${process.pid}${colors.reset}`);
    console.log(`  ${pad("Environment:", 15)} ${colors.magenta}${process.env.NODE_ENV || "development"}${colors.reset}`);
    console.log(`  ${pad("Node Version:", 15)} ${colors.yellow}${process.version}${colors.reset}`);
    console.log(`  ${pad("Bun Version:", 15)} ${colors.yellow}${Bun.version}${colors.reset}`);
	prompt();
}

function quit() {
    console.log(`\n  ${colors.yellow}Shutting down server... Goodbye! 👋${colors.reset}\n`);
	process.stdin.setRawMode(false);
	process.stdin.pause();
	process.exit(0);
}

function header() {
    console.clear();
    console.log("");
    console.log(`  ${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`  ${colors.cyan}║${colors.reset}  ${colors.bold}🚀 Ingestion Service Dev Server${colors.reset}                   ${colors.cyan}║${colors.reset}`);
    console.log(`  ${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}`);
    console.log("");
    console.log(`  ${colors.dim}Listening at ${colors.bold}${colors.green}${baseUrl}${colors.reset}`);
}

function prompt() {
    console.log("");
    console.log(`  ${colors.bold}Available Commands:${colors.reset}`);
    const cmds = [
        { key: "x", desc: "Open in browser" },
        { key: "r", desc: "Request /" },
        { key: "h", desc: "Request /health" },
        { key: "b", desc: "Build ingestion" },
        { key: "t", desc: "Run test suite" },
        { key: "i", desc: "Show server info" },
        { key: "c", desc: "Clear console" },
        { key: "q", desc: "Quit server" }
    ];

    for (let i = 0; i < cmds.length; i += 2) {
        const col1 = `  ${colors.cyan}${cmds[i].key}${colors.reset} ${colors.dim}·${colors.reset} ${pad(cmds[i].desc, 20)}`;
        const col2 = cmds[i + 1] ? `${colors.cyan}${cmds[i + 1].key}${colors.reset} ${colors.dim}·${colors.reset} ${cmds[i + 1].desc}` : "";
        console.log(`${col1}${col2}`);
    }
    
    console.log("");
	process.stdout.write(`  ${colors.cyan}❯${colors.reset} `);
}

function listen() {
	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdin.setEncoding("utf8");

	process.stdin.on("data", function (key: string) {
		const k = key.toLowerCase();

		if (k === "x") { process.stdout.write("x\n"); open(baseUrl); prompt(); }
		else if (k === "r") { process.stdout.write("r\n"); request("/"); }
		else if (k === "h") { process.stdout.write("h\n"); request("/health"); }
		else if (k === "b") { process.stdout.write("b\n"); runCommand("build", ["bun", "run", "build"]); }
		else if (k === "t") { process.stdout.write("t\n"); runCommand("test", ["bun", "test"]); }
		else if (k === "c") { clear(); }
		else if (k === "i") { process.stdout.write("i\n"); info(); }
		else if (k === "q" || key === "\u0003") { quit(); }
		else {
            // ignore empty / unsupported keystrokes smoothly
        }
	});
}

function start() {
	let port = 3000;

	while (true) {
		try {
			server = serve({
				fetch: app.fetch,
				port,
			});

			baseUrl = "http://localhost:" + server.port;

			header();
			prompt();
			listen();

			return;
		} catch {
			port++;
		}
	}
}

start();