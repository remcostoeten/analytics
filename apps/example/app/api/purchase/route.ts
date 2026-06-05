import { trackServerEvent } from "@remcostoeten/analytics/server";

export async function POST() {
	// your real purchase logic here

	await trackServerEvent("purchase_completed", {
		plan: "pro",
		revenue: 49,
		currency: "USD",
	}, {
		projectId: "example-app",
		path: "/api/purchase",
	});

	return Response.json({ ok: true });
}
