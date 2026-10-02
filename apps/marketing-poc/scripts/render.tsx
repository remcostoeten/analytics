import { renderToString } from "react-dom/server";

import StacklyPage from "@/app/stackly/page";
import TerminalPage from "@/app/terminal/page";

const variant = process.argv[4] === "terminal" ? "terminal" : "stackly";
const css = await Bun.file(process.argv[2]!).text();
const body = renderToString(variant === "terminal" ? <TerminalPage /> : <StacklyPage />);
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${variant === "terminal" ? "Stackly Terminal" : "Stackly Landing"}</title>
<meta name="description" content="Turn scattered tasks into shipped software." />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
<style>${css}</style>
</head>
<body class="min-h-screen">
<div class="copper-grain"></div>
<div id="root" data-variant="${variant}">${body}</div>
<script src="app.js" defer></script>
</body>
</html>`;
await Bun.write(process.argv[3]!, html);
console.log(html.length);
