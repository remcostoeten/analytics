import { Context } from "hono";
import { dataRetainer } from "../utilities/data-retention.js";

function requireAdminAuth(c: Context): Response | null {
	const secret = process.env.ADMIN_SECRET;
	if (!secret) {
		return c.json(
			{ ok: false, error: "Admin endpoints are disabled (ADMIN_SECRET not configured)" },
			403,
		);
	}
	const provided =
		c.req.header("x-admin-secret") || c.req.header("authorization")?.replace("Bearer ", "");
	if (provided !== secret) {
		return c.json({ ok: false, error: "Unauthorized" }, 401);
	}
	return null;
}

export async function handleAdminCleanup(c: Context) {
	const authError = requireAdminAuth(c);
	if (authError) return authError;

	try {
		await dataRetainer.cleanupOldData();

		return c.json({
			ok: true,
			message: "Data cleanup completed successfully",
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Admin cleanup failed:", error);
		return c.json(
			{
				ok: false,
				error: "Cleanup failed",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			500,
		);
	}
}

export async function handleAdminStats(c: Context) {
	const authError = requireAdminAuth(c);
	if (authError) return authError;

	try {
		const stats = await dataRetainer.getRetentionStats();
		const policy = dataRetainer.getPolicy();

		return c.json({
			ok: true,
			timestamp: new Date().toISOString(),
			stats,
			policy,
		});
	} catch (error) {
		console.error("Admin stats failed:", error);
		return c.json(
			{
				ok: false,
				error: "Failed to get stats",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			500,
		);
	}
}
