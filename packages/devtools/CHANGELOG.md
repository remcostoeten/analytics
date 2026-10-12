# @spoar/devtools

## 0.1.0

### Minor Changes

- 75c1bdc: The dev widget: an overlay panel for admins with online visitors, sessions, a log stream with JSON detail, speed per route, error groups and an overview. `mount()` works on any page, `./react` exports `<Devtools />` and `./next` loads it client-only. A loader under 1 KB gzip checks `GET /v2/widget/session` and imports the panel only for an admin, rendered in a Shadow DOM with Tailwind compiled at build time. `./fixtures` serves sample data until the widget endpoints ship.

### Patch Changes

- e9d010d: First stable release. Every version now publishes to the npm `latest` tag and the `next` tag is retired, so a plain `npm install` gets the current release.
- ebc8906: Link the README screenshot and the dev widget docs page with absolute URLs, so both work on npmjs.com.
- Updated dependencies [e9d010d]
- Updated dependencies [07effe4]
- Updated dependencies [b892d01]
- Updated dependencies [5759d5a]
- Updated dependencies [a49f86d]
- Updated dependencies [433591a]
- Updated dependencies [73de052]
- Updated dependencies [73de052]
- Updated dependencies [1dd8040]
- Updated dependencies [2649b4b]
- Updated dependencies [f385d23]
- Updated dependencies [e37cc23]
- Updated dependencies [2cd492f]
- Updated dependencies [66ca388]
- Updated dependencies [6dc1629]
  - @spoar/sdk@2.0.0

## 0.1.0-next.2

### Patch Changes

- ebc8906: Link the README screenshot and the dev widget docs page with absolute URLs, so both work on npmjs.com.
- Updated dependencies [2cd492f]
  - @spoar/sdk@2.0.0-next.2

## 0.1.0-next.1

### Minor Changes

- 75c1bdc: The dev widget: an overlay panel for admins with online visitors, sessions, a log stream with JSON detail, speed per route, error groups and an overview. `mount()` works on any page, `./react` exports `<Devtools />` and `./next` loads it client-only. A loader under 1 KB gzip checks `GET /v2/widget/session` and imports the panel only for an admin, rendered in a Shadow DOM with Tailwind compiled at build time. `./fixtures` serves sample data until the widget endpoints ship.

### Patch Changes

- Updated dependencies [07effe4]
- Updated dependencies [b892d01]
- Updated dependencies [5759d5a]
- Updated dependencies [a49f86d]
- Updated dependencies [433591a]
- Updated dependencies [73de052]
- Updated dependencies [73de052]
- Updated dependencies [2649b4b]
- Updated dependencies [f385d23]
- Updated dependencies [e37cc23]
- Updated dependencies [66ca388]
- Updated dependencies [6dc1629]
  - @spoar/sdk@2.0.0-next.1
