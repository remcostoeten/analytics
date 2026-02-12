import { describe, test, expect } from "bun:test"
import { events, resume, visitors, visitorEvents } from "../schema"

describe("events schema", () => {
    test("has all required columns", () => {
        const columns = Object.keys(events)

        expect(columns).toContain("id")
        expect(columns).toContain("projectId")
        expect(columns).toContain("type")
        expect(columns).toContain("ts")
        expect(columns).toContain("path")
        expect(columns).toContain("visitorId")
        expect(columns).toContain("sessionId")
        expect(columns).toContain("country")
        expect(columns).toContain("meta")
    })

    test("exports Event type", () => {
        const event: typeof events.$inferSelect = {
            id: BigInt(1),
            projectId: "test",
            type: "pageview",
            ts: new Date(),
            path: "/",
            referrer: null,
            origin: null,
            host: null,
            isLocalhost: false,
            ua: null,
            lang: null,
            deviceType: null,
            ipHash: null,
            visitorId: null,
            sessionId: null,
            country: null,
            region: null,
            city: null,
            meta: null
        }

        expect(event.projectId).toBe("test")
    })
})

describe("legacy tables schema", () => {
    test("exports resume table columns", () => {
        const columns = Object.keys(resume)

        expect(columns).toContain("id")
        expect(columns).toContain("event")
        expect(columns).toContain("ts")
        expect(columns).toContain("resumeVersion")
    })

    test("exports visitors table columns", () => {
        const columns = Object.keys(visitors)

        expect(columns).toContain("id")
        expect(columns).toContain("fingerprint")
        expect(columns).toContain("firstSeen")
        expect(columns).toContain("lastSeen")
    })

    test("exports visitorEvents table columns", () => {
        const columns = Object.keys(visitorEvents)

        expect(columns).toContain("id")
        expect(columns).toContain("visitorId")
        expect(columns).toContain("eventType")
        expect(columns).toContain("sessionId")
    })
})
