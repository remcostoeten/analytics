export type Tier = "separate" | "colocated" | "sdk-only";

export type ScaffoldOptions = {
	projectName: string;
	projectId: string;
	tier: Tier;
	targetDir: string;
};

export type ScaffoldFile = {
	path: string;
	content: string;
};
