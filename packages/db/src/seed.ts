import { db } from "./client";
import { events } from "./schema";

const PROJECTS = ["analytics-demo.io", "skriuw.dev", "personal-site.com"];
const BROWSERS = [
  { name: "Chrome", version: "120.0.0" },
  { name: "Safari", version: "17.1" },
  { name: "Firefox", version: "119.0" },
  { name: "Edge", version: "120.0" },
];
const OS = [
  { name: "Mac OS", version: "14.0" },
  { name: "Windows", version: "11" },
  { name: "iOS", version: "17.0" },
  { name: "Android", version: "14" },
];
const COUNTRIES = ["United States", "Netherlands", "United Kingdom", "Germany", "France", "Canada", "Australia", "Japan", "Brazil"];
const REGIONS = {
  "United States": ["California", "New York", "Texas", "Florida"],
  "Netherlands": ["North Holland", "South Holland", "Utrecht", "North Brabant"],
  "United Kingdom": ["London", "Manchester", "Birmingham", "Scotland"],
  "Germany": ["Berlin", "Bavaria", "Hamburg", "Hesse"],
};
const CITIES = {
  "California": ["San Francisco", "Los Angeles", "San Diego"],
  "New York": ["New York City", "Buffalo", "Rochester"],
  "North Holland": ["Amsterdam", "Haarlem", "Zaanstad"],
  "London": ["Westminster", "Camden", "Greenwich"],
};
const PATHS = ["/", "/features", "/pricing", "/docs", "/blog", "/about"];
const REFERRERS = ["https://google.com", "https://twitter.com", "https://github.com", ""];
const DEVICES = ["desktop", "mobile", "tablet"];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  console.log("🌱 Starting advanced seed...");

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const entries: any[] = [];

  // Generate 200 visitors
  for (let i = 0; i < 200; i++) {
    const visitorId = `v-${Math.random().toString(36).substring(7)}`;
    const projectId = getRandomItem(PROJECTS);
    const browser = getRandomItem(BROWSERS);
    const os = getRandomItem(OS);
    const deviceType = getRandomItem(DEVICES);
    const lang = "en-US";
    const screenSize = deviceType === "mobile" ? "390x844" : "1920x1080";
    const viewport = deviceType === "mobile" ? "390x844" : "1440x900";
    
    // Geographic data for this visitor
    const country = getRandomItem(COUNTRIES);
    const regionList = (REGIONS as any)[country] || ["Unknown"];
    const region = getRandomItem(regionList);
    const cityList = (CITIES as any)[region] || ["Unknown"];
    const city = getRandomItem(cityList);

    // Advanced traits for this visitor (Segmentation & A/B tests)
    const userProperties = {
      plan: Math.random() > 0.8 ? "pro" : "free",
      role: Math.random() > 0.9 ? "admin" : "user",
    };
    const experiments = {
      pricing_color: Math.random() > 0.5 ? "green" : "red",
    };

    // Each visitor has 1-5 sessions
    const sessionCount = getRandomInt(1, 5);
    for (let s = 0; s < sessionCount; s++) {
      const sessionId = `s-${Math.random().toString(36).substring(7)}`;
      
      const sessionStart = new Date(thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime()));
      let lastEventTime = sessionStart;

      // Force a funnel for ~30% of sessions
      const isFunnelSession = Math.random() > 0.7;
      let funnelStep = 0;

      const pageviewCount = getRandomInt(1, 10);
      for (let p = 0; p < pageviewCount; p++) {
        let path = getRandomItem(PATHS);
        
        // Force funnel path progression
        if (isFunnelSession) {
          if (funnelStep === 0) { path = "/"; }
          else if (funnelStep === 1) { path = "/pricing"; }
          else if (funnelStep === 2) { path = "/signup"; }
        }

        const referrer = p === 0 ? getRandomItem(REFERRERS) : null;
        const timestamp = new Date(lastEventTime.getTime() + getRandomInt(1000, 60000));
        lastEventTime = timestamp;

        // Base metadata (injecting user attributes & experiments uniformly)
        const meta: any = {
          browser: browser.name,
          browserVersion: browser.version,
          os: os.name,
          osVersion: os.version,
          screenSize,
          viewport,
          botDetected: false,
          userProperties,
          experiments
        };

        if (p === 0 && Math.random() > 0.7) {
          meta.utmSource = getRandomItem(["twitter", "linkedin", "google", "newsletter"]);
          meta.utmMedium = "social";
        }

        // 1. Pageview
        entries.push({
          projectId,
          type: "pageview",
          ts: timestamp,
          path,
          referrer,
          visitorId,
          sessionId,
          deviceType,
          lang,
          country,
          region,
          city,
          meta,
        });

        // 2. Funnel conversion events
        if (isFunnelSession && funnelStep === 1) {
          entries.push({
             projectId, type: "event", ts: new Date(timestamp.getTime() + 2000), path, visitorId, sessionId, deviceType,
             meta: { ...meta, eventName: "signup" },
             country,
             region,
             city,
          });
        }
        if (isFunnelSession && funnelStep === 2) {
          entries.push({
             projectId, type: "event", ts: new Date(timestamp.getTime() + 3000), path, visitorId, sessionId, deviceType,
              meta: { 
                ...meta, 
                eventName: "transaction", 
                revenue: getRandomInt(29, 299),
                currency: "USD",
                items: getRandomInt(1, 5),
                orderId: `ORD-${getRandomInt(1000, 9999)}`
              },
              country,
              region,
              city,
           });
        }
        
        funnelStep++;

        // 3. Search events
        if (Math.random() > 0.8) {
           entries.push({
             projectId, type: "event", ts: new Date(timestamp.getTime() + 5000), path, visitorId, sessionId, deviceType,
             meta: { 
               ...meta, 
               eventName: "site_search", 
               query: getRandomItem(["how to invite", "pricing tiers", "dark mode"]),
               resultCount: Math.random() > 0.8 ? 0 : getRandomInt(1, 10)
             },
              country,
              region,
              city,
          });
        }

        // 4. Performance & Engagement
        if (Math.random() > 0.3) {
          entries.push({
            projectId, type: "event", ts: new Date(timestamp.getTime() + 100), path, visitorId, sessionId, deviceType,
            meta: {
              ...meta,
              eventName: "web-vitals",
              ttfb: getRandomInt(50, 300),
              fcp: getRandomInt(200, 1000),
              lcp: getRandomInt(500, 2500)
            },
            country,
            region,
            city,
          });
        }

        if (Math.random() > 0.5) {
          entries.push({
            projectId, type: "event", ts: new Date(timestamp.getTime() + 15000), path, visitorId, sessionId, deviceType,
            meta: { ...meta, eventName: "time-on-page", timeOnPageMs: getRandomInt(5000, 120000) },
            country,
            region,
            city,
          });
        }
      }
    }

    if (entries.length > 1000) {
      console.log(`Inserting ${entries.length} records...`);
      await db.insert(events).values(entries);
      entries.length = 0;
    }
  }

  if (entries.length > 0) {
    console.log(`Inserting final ${entries.length} records...`);
    await db.insert(events).values(entries);
  }

  console.log("✅ Advanced seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:");
  console.error(err);
  process.exit(1);
});
