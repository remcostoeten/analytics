import app from "./app.js";
import { serve } from "bun";

function incrementPortIfPortIsTaken(port: number) {
    const wantedPort = '3000'
    const portNumber = parseInt(wantedPort)
    const incrementedPort = portNumber + 1
    try {
        if (portNumber === port) {
            return incrementPortIfPortIsTaken(incrementedPort)
        }
        return portNumber
    } catch (error) {

    }
}

serve({ fetch: app.fetch, port: 3000 });

console.log("🚀 Ingestion server running on http://localhost:3000");
