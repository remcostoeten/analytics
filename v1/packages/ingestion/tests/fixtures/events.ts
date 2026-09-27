export const mockPageView = {
	projectId: "example.com",
	type: "pageview",
	path: "/home",
	visitorId: "visitor-123",
	sessionId: "session-456",
	ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
	lang: "en-US",
};

export const mockCustomEvent = {
	projectId: "example.com",
	type: "button_click",
	path: "/signup",
	visitorId: "visitor-123",
	sessionId: "session-456",
	meta: {
		button: "signup",
		location: "header",
	},
};

export const mockBotEvent = {
	projectId: "example.com",
	type: "pageview",
	path: "/",
	ua: "Googlebot/2.1",
};
