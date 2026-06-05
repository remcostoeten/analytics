import app from "./app.js";

export { app };
export { default } from "./app.js";
export function createIngestionApp() {
	return app;
}

export { events, visitors, db } from "./db/index.js";
export type { Event, NewEvent, Visitor, NewVisitor } from "./db/index.js";
