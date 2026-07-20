import { Context } from "hono";
import { dataRetainer } from "../utilities/data-retention.js";
import { rollupDays } from "../utilities/rollup.js";

export function requireAdminAuth(c: Context): Response | null {
	const adminSecret = process.env.ADMIN_SECRET;
	const cronSecret = process.env.CRON_SECRET;
	if (!adminSecret && !cronSecret) {
		return c.json(
			{ ok: false, error: "Admin endpoints are disabled (ADMIN_SECRET not configured)" },
			403,
		);
	}
	const provided =
		c.req.header("x-admin-secret") || c.req.header("authorization")?.replace("Bearer ", "");
	if (!provided) {
		return c.json({ ok: false, error: "Unauthorized" }, 401);
	}
	const allowed = (adminSecret && provided === adminSecret) || (cronSecret && provided === cronSecret);
	if (!allowed) {
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

const DEFAULT_ROLLUP_DAYS = 8;

export async function handleAdminRollup(c: Context) {
	const authError = requireAdminAuth(c);
	if (authError) return authError;

	const daysParam = Number(c.req.query("days") ?? DEFAULT_ROLLUP_DAYS);
	const days = Number.isFinite(daysParam)
		? Math.min(Math.max(Math.trunc(daysParam), 1), 90)
		: DEFAULT_ROLLUP_DAYS;

	try {
		const result = await rollupDays(days);

		return c.json({
			ok: true,
			...result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Admin rollup failed:", error);
		return c.json(
			{
				ok: false,
				error: "Rollup failed",
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
