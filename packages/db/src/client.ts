import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { events, resume, visitors, visitorEvents } from "./schema"

function getDbClient() {
    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) {
        throw new Error("DATABASE_URL environment variable is required")
    }

    const sql = neon(databaseUrl)
    return drizzle(sql, { schema: { events, resume, visitors, visitorEvents } })
}

export const db = getDbClient()
