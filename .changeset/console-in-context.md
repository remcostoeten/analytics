---
"@spoar/debugtools": minor
"@spoar/sdk": minor
---

The debug console opens on the page you are looking at. **This page** shows the current path's visitors, pageviews, bounce rate, referrers, Web Vitals and issues, and can pin click counts on elements marked with `data-spoar-click`. **My events** lists every event this tab sent, with whether the API accepted it, rejected it or the SDK dropped it. **Count my visits** opts this browser out of tracking, and **Annotate** adds a chart annotation for a release or a post. SQL moves behind the new `tabs` option. `<Analytics debugConsole />` hands its client to the console, and `error` listeners receive the rejected event as a third argument.
