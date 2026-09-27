import app from "@remcostoeten/ingestion";
import { serve } from "bun";

function start(port: number): void {
  try {
    const server = serve({ fetch: app.fetch, port });
    console.log(`Ingestion running at http://localhost:${server.port}`);
  } catch {
    start(port + 1);
  }
}

start(Number(process.env.PORT ?? 3000));
