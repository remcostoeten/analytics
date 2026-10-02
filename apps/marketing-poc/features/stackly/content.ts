export type TicketStatus = "backlog" | "todo" | "in-progress";

export type Ticket = {
  id: string;
  title: string;
  status: TicketStatus;
};

export type Capability = {
  name: string;
  note: string;
  figure: "dependencies" | "map" | "relationships" | "workload";
};

export type Feature = {
  name: string;
  note: string;
  figure: "timeline" | "focus" | "cards" | "toolbar" | "stack";
};

export type Customer = {
  name: string;
  weight: "bold" | "serif" | "wide";
};

export const navSteps = [
  { label: "Build", index: "01", target: "build" },
  { label: "Ship", index: "02", target: "ship" },
  { label: "Track", index: "03", target: "track" },
] as const;

export const navLinks = [
  { label: "Docs", badge: null },
  { label: "Blog", badge: null },
  { label: "Careers", badge: "24" },
  { label: "Book a call", badge: null },
] as const;

export const tickets: Ticket[] = [
  {
    id: "TICKET-1042",
    title: "API authentication fails intermittently in production",
    status: "backlog",
  },
  {
    id: "TICKET-1041",
    title: "Dashboard loading time exceeds 3s on mobile devices",
    status: "backlog",
  },
  {
    id: "TICKET-1040",
    title: "User session timeout not respecting user settings",
    status: "backlog",
  },
  {
    id: "TICKET-1033",
    title: "Cross-site scripting vulnerability in form submissions",
    status: "backlog",
  },
  {
    id: "TICKET-1038",
    title: "Payment processing webhook fails for international transactions",
    status: "todo",
  },
  {
    id: "TICKET-1100",
    title: "Analytics report generation takes too long to complete",
    status: "todo",
  },
  {
    id: "TICKET-1034",
    title: "Search functionality fails with special characters",
    status: "todo",
  },
  {
    id: "TICKET-1036",
    title: "In-app messaging feature not delivering messages reliably",
    status: "in-progress",
  },
  {
    id: "TICKET-1029",
    title: "Export to CSV drops rows with unicode in the title",
    status: "in-progress",
  },
];

export const taskCount = 15;

export const incomingTickets: Ticket[] = [
  {
    id: "TICKET-1101",
    title: "Rate limiter returns 500 instead of 429 under load",
    status: "backlog",
  },
  { id: "TICKET-1102", title: "Invoice PDF renders blank logo on Safari", status: "backlog" },
  { id: "TICKET-1103", title: "Onboarding email sent twice for SSO signups", status: "backlog" },
];

export const ticketGroups: { status: TicketStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "todo", label: "Todo" },
  { status: "in-progress", label: "In Progress" },
];

export const customers: Customer[] = [
  { name: "ramp", weight: "bold" },
  { name: "evil", weight: "serif" },
  { name: "zade", weight: "bold" },
  { name: "charact", weight: "serif" },
  { name: "goodfire", weight: "wide" },
  { name: "incept", weight: "bold" },
  { name: "Ar.", weight: "serif" },
  { name: "browser", weight: "bold" },
  { name: "Premium Airlines", weight: "serif" },
  { name: "standard", weight: "wide" },
];

export const capabilities: Capability[] = [
  {
    name: "Dependency Mapping",
    note: "Visualize how tickets connect across projects, dev branches, and releases.",
    figure: "dependencies",
  },
  {
    name: "Global Team Activity",
    note: "Track distributed teams in real time: see who is active, where, and on what.",
    figure: "map",
  },
  {
    name: "Task Relationships",
    note: "See how one blocked ticket ripples across every dependent task downstream.",
    figure: "relationships",
  },
  {
    name: "Workload Balance",
    note: "Compare capacity across teams so no one's sprint is silently overloaded.",
    figure: "workload",
  },
];

export const features: Feature[] = [
  {
    name: "Timeline View",
    note: "See every task laid out by owner and due date, updated as work moves.",
    figure: "timeline",
  },
  {
    name: "One Toolbar, Every Action",
    note: "Import tasks, mark them done, leave notes, and check insights, all without switching screens.",
    figure: "toolbar",
  },
  {
    name: "Focus Mode",
    note: "Mute every ping and notification while you work, resume the moment you are ready.",
    figure: "focus",
  },
  {
    name: "Task Cards, Simplified",
    note: "Every card shows exactly what is next, who owns it, and when it is ready to go.",
    figure: "cards",
  },
  {
    name: "Connects To Your Stack",
    note: "Sync automatically with the code repos, docs, and chat tools your team relies on.",
    figure: "stack",
  },
];

export const footerColumns = [
  { title: "Product", links: ["Build", "Ship", "Track", "Pricing", "Changelog"] },
  { title: "Company", links: ["About", "Careers", "Blog", "Press"] },
  { title: "Resources", links: ["Docs", "API", "Status", "Security"] },
] as const;

export const activityFeed = [
  { id: "TICKET-1036", event: "moved to In Progress by merge of feat/messaging", when: "just now" },
  { id: "TICKET-1029", event: "checks passed on PR #418", when: "14s ago" },
  { id: "TICKET-1101", event: "created from Sentry alert", when: "40s ago" },
  { id: "TICKET-1038", event: "assigned to Ben Barlow", when: "1m ago" },
  { id: "TICKET-1100", event: "estimate changed to 3 points", when: "2m ago" },
] as const;
