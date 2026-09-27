export type GeoScope = {
	timeRange: string;
	from: string | null;
	to: string | null;
	projectId: string | null;
	origin: string | null;
};

export function readGeoScope(searchParams: URLSearchParams): GeoScope {
	return {
		timeRange: searchParams.get("timeRange") || "30d",
		from: searchParams.get("from"),
		to: searchParams.get("to"),
		projectId: searchParams.get("projectId"),
		origin: searchParams.get("origin"),
	};
}

export function geoScopeParams(metric: string, scope: GeoScope): URLSearchParams {
	const params = new URLSearchParams({ metric, timeRange: scope.timeRange });
	if (scope.from && scope.to) {
		params.set("from", scope.from);
		params.set("to", scope.to);
	}
	if (scope.projectId) params.set("projectId", scope.projectId);
	if (scope.origin) params.set("origin", scope.origin);
	return params;
}
