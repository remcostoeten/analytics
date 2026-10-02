export type Step = {
  index: string;
  title: string;
  body: string;
  state: "board" | "merge" | "done";
};

export type LedgerRow = {
  index: string;
  name: string;
  summary: string;
  detail: string;
  command: string;
};

export type Plan = {
  name: string;
  price: string;
  unit: string;
  lines: string[];
};

export const commands = [
  {
    input: "stackly status --team platform",
    lines: [
      "  BACKLOG     14   ▇▇▇▇▇▇▇▇▇▇▇▇▇▇",
      "  TODO         6   ▇▇▇▇▇▇",
      "  IN PROGRESS  3   ▇▇▇",
      "  BLOCKED      1   ▇",
      "",
      "  cycle time  2.4d   -18% vs last sprint",
    ],
  },
  {
    input: "stackly merge feat/rate-limits",
    lines: [
      "  ✓ checks passed (4/4)",
      "  ✓ merged into main @ a81f2c",
      "  → TICKET-1101 moved to DONE",
      "  → 2 dependents unblocked",
    ],
  },
  {
    input: "stackly who --blocked",
    lines: [
      "  TICKET-1038  Payment webhook   waiting on  TICKET-1029",
      "  TICKET-1029  CSV export        assigned    Ben Barlow",
      "",
      "  1 chain · longest 2 hops",
    ],
  },
] as const;

export const ticker = [
  "TICKET-1036 → IN PROGRESS",
  "feat/messaging merged",
  "TICKET-1101 created from alert",
  "sprint 14 at 62%",
  "TICKET-1029 assigned to Ben",
  "checks green on PR #418",
  "cycle time 2.4d",
] as const;

export const steps: Step[] = [
  {
    index: "01",
    title: "Plan on one board",
    body: "Every ticket, branch and release lives on the same surface. No private lists, no side spreadsheets, no re-asking what is next.",
    state: "board",
  },
  {
    index: "02",
    title: "Ship from the branch",
    body: "Merging is the status update. The ticket reads the pipeline and moves itself the moment the work actually lands.",
    state: "merge",
  },
  {
    index: "03",
    title: "See the ripple",
    body: "Dependents unblock, capacity rebalances, and the sprint burn updates. Nobody types done, nobody chases anyone.",
    state: "done",
  },
];

export const ledger: LedgerRow[] = [
  {
    index: "001",
    name: "Dependency graph",
    summary: "Tickets, branches and releases as one graph.",
    detail:
      "Every edge is derived from code: a branch name, a PR reference or a release tag. Blocked chains are listed longest first so the next unblock is obvious.",
    command: "stackly graph --blocked",
  },
  {
    index: "002",
    name: "Auto status",
    summary: "The pipeline writes the status, not people.",
    detail:
      "Opened PR moves a ticket to In Progress, green checks to In Review, merge to Done. Manual overrides are logged with the reason.",
    command: "stackly watch main",
  },
  {
    index: "003",
    name: "Capacity ledger",
    summary: "Points per person per week, with the overflow visible.",
    detail:
      "Each sprint is a ledger: committed, landed, carried over. Overloaded weeks show up as a red column before they happen.",
    command: "stackly capacity --sprint 14",
  },
  {
    index: "004",
    name: "Focus mode",
    summary: "Silence everything that is not yours for a block of time.",
    detail:
      "Mentions queue, reviews wait, and the board freezes your column. When the block ends the queue replays in order.",
    command: "stackly focus 90m",
  },
  {
    index: "005",
    name: "Terminal first",
    summary: "Every action is a command. The UI is a view on it.",
    detail:
      "The CLI, the API and the board share one command log, so anything you can click you can script and audit.",
    command: "stackly --help",
  },
];

export const manifesto = [
  "Status meetings exist because the system cannot answer the question.",
  "A ticket that needs a human to move it is already out of date.",
  "The branch knows what shipped. Ask the branch.",
  "One board. One log. No side channels.",
];

export const plans: Plan[] = [
  {
    name: "Solo",
    price: "0",
    unit: "forever",
    lines: ["1 project", "Unlimited tickets", "CLI and board", "Community support"],
  },
  {
    name: "Team",
    price: "12",
    unit: "per seat / month",
    lines: [
      "Unlimited projects",
      "Auto status from Git",
      "Capacity ledger",
      "Focus mode",
      "Priority support",
    ],
  },
  {
    name: "Org",
    price: "Talk",
    unit: "to us",
    lines: ["SSO and audit log", "Self-hosted option", "Custom integrations", "Dedicated engineer"],
  },
];
