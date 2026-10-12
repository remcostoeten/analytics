# Writing the docs

Rules for every page in `apps/docs/content`. They combine the [Google developer documentation style guide](https://developers.google.com/style), the [Diátaxis](https://diataxis.fr) page types and the repo's own rules in `AGENTS.md`.

## Pick one page type

Each page does one job. Mixing them is the most common reason a page is hard to use.

| Type | Section | Reader wants to | Contains | Leaves out |
| --- | --- | --- | --- | --- |
| Tutorial | Getting started | Learn by doing | One path from nothing to a working result | Options, alternatives, theory |
| How-to guide | Guides, Frameworks | Finish a task they already chose | Numbered steps toward one goal | Teaching basics, full option lists |
| Reference | SDK, Plugins, API | Look up a fact | Every option, type, default and limit, in tables | Opinions, stories, steps |
| Explanation | Concepts, Edge cases | Understand why | Causes, trade-offs, what happens underneath | Step-by-step instructions |

Troubleshooting pages are how-to guides keyed by symptom: the heading is what the reader sees, the body is the cause and the fix.

## Voice

- Second person, present tense, active voice. "The SDK sends a pageview", not "A pageview will be sent".
- Say what the thing does. Replace adjectives with facts: "under 4.5 KB gzipped", not "lightweight".
- One idea per sentence. Short paragraphs, three sentences at most.
- Start instructions with the verb: "Add the proxy route", not "You will want to add the proxy route".
- Name the condition before the action: "If events do not arrive, check the key", not the reverse.
- Use the serial comma.

## Never write

- Em dashes or en dashes. Use a comma, a colon, a full stop or a new sentence.
- Exclamation marks, emoji, or rhetorical questions as headings.
- Marketing words: seamless, powerful, robust, effortless, blazing, lightweight, cutting-edge, best-in-class, simply, just, easily, of course.
- AI filler: "It's worth noting", "Keep in mind", "Let's dive in", "In this guide, we'll", "Whether you're X or Y", "delve", "leverage", "unlock", "empower", "elevate", "navigate the complexities", "in today's", "a testament to", "not only X but also Y".
- Closing summaries that restate the page, and "Next steps" that list every other page.
- Groups of three adjectives or three parallel clauses added for rhythm.
- Headings that describe benefits ("Why it matters", "Key benefits").
- Claims that cannot be checked against the source code.

## Structure

- Frontmatter: `title` is a noun phrase for reference pages and an imperative for guides ("Track custom events"). `description` is one plain sentence.
- The first paragraph says what the page covers and who needs it. No preamble.
- Headings are sentence case and say what the section contains.
- Steps are numbered and each step is one action. Put the expected result after the step when it is not obvious.
- Tables for options, limits, events and status codes. Columns: name, type, default, what it does.
- Link the first mention of another page, then stop linking it.

## Code

- Every example runs as written against the current source. Check export names, option names and signatures in `packages/sdk/src` and `apps/api` before using them.
- Use the same placeholders everywhere: project `example.com`, public key `pk_...`, secret key `sk_...`, endpoint `/_ra`.
- Show the smallest example that works, then the variations.
- Label files with their path in the sentence before the block: "`app/providers.tsx`:".

## Changelog posts

`content/changelog` holds one MDX file per post, listed at `/changelog` newest first. A post covers one change a user will notice: a new view, a new package, a release. Every version of every package stays in `content/docs/changelog.mdx`, so a post never lists them.

| Field | Holds |
| --- | --- |
| `title` | What changed, as a noun phrase: "The dev widget", not "Introducing the dev widget" |
| `description` | One sentence on what it does |
| `date` | The day it reached production, as `YYYY-MM-DD` |
| `label` | `release`, `feature`, `improvement` or `fix` |
| `image`, `imageAlt` | A screenshot under `public/images/changelog`, 16:9 at 1600 px wide as WebP, and what it shows |
| `docs` | The page to read next |

The body is three or four short paragraphs: what it is, how it behaves, the smallest code or the keys that use it.

## Checks before committing

```bash
rg -n "—|–" apps/docs/content
rg -ni "seamless|powerful|robust|effortless|leverage|delve|simply|just |easily|worth noting|keep in mind|let's" apps/docs/content
bun run --cwd apps/docs build
```

Both searches should return nothing, apart from words that are part of code or quoted API output.
