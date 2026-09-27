import app from "./index";

app.listen(Number(process.env.PORT ?? 3100));
console.log(`API listening on http://localhost:${app.server?.port ?? "?"}/v2/health`);
