import { neon } from "@neondatabase/serverless";

// Create reusable SQL client
// Will throw if DATABASE_URL is not set - this is intentional for early error detection
const sql = neon(process.env.DATABASE_URL!);

export { sql };
