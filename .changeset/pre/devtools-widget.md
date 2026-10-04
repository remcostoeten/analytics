---
"@spoar/devtools": minor
---

The dev widget: an overlay panel for admins with online visitors, sessions, a log stream with JSON detail, speed per route, error groups and an overview. `mount()` works on any page, `./react` exports `<Devtools />` and `./next` loads it client-only. A loader under 1 KB gzip checks `GET /v2/widget/session` and imports the panel only for an admin, rendered in a Shadow DOM with Tailwind compiled at build time. `./fixtures` serves sample data until the widget endpoints ship.
