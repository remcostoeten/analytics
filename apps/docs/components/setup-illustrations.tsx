import styles from "./setup-illustrations.module.css";

type DrawingKind = "browser" | "proxy" | "database" | "dashboard" | "plugin";

type DrawingProps = {
  kind: DrawingKind;
};

function SetupDrawing({ kind }: DrawingProps) {
  return (
    <svg className={styles.drawing} viewBox="0 0 160 100" fill="none" aria-hidden="true">
      {kind === "browser" ? (
        <>
          <rect x="20" y="15" width="120" height="76" rx="8" />
          <path d="M20 33h120M31 24h2m6 0h2m6 0h2" />
          <rect className={styles.wash} x="30" y="44" width="38" height="35" rx="4" />
          <path d="M79 48h43M79 57h32M79 70h22" />
          <path className={styles.accent} d="m112 66 4 25 6-8 10-3-20-14Z" />
        </>
      ) : null}
      {kind === "proxy" ? (
        <>
          <rect x="36" y="16" width="88" height="27" rx="6" />
          <rect x="36" y="53" width="88" height="27" rx="6" />
          <path d="M48 29h3m7 0h3M48 66h3m7 0h3M91 29h20M91 66h20M80 43v10" />
          <path className={styles.accent} d="M111 55V44a9 9 0 0 1 18 0v11" />
          <rect className={styles.wash} x="105" y="55" width="30" height="25" rx="5" />
          <path className={styles.accent} d="M120 65v5" />
        </>
      ) : null}
      {kind === "database" ? (
        <>
          <path className={styles.wash} d="M42 29v46c0 9 76 9 76 0V29" />
          <ellipse cx="80" cy="29" rx="38" ry="12" />
          <path d="M42 45c0 16 76 16 76 0M42 61c0 16 76 16 76 0" />
          <circle className={styles.wash} cx="119" cy="74" r="16" />
          <path className={styles.accent} d="m111 74 5 5 10-11" />
        </>
      ) : null}
      {kind === "dashboard" ? (
        <>
          <rect x="20" y="15" width="120" height="76" rx="8" />
          <path d="M20 33h120M44 33v58M29 45h6m-6 10h6m-6 10h6" />
          <path className={styles.wash} d="M56 77V64l16-7 14 5 16-19 26 8v26Z" />
          <path className={styles.accent} d="m56 64 16-7 14 5 16-19 26 8" />
          <path d="M56 82h72" />
        </>
      ) : null}
      {kind === "plugin" ? (
        <>
          <rect x="30" y="26" width="78" height="48" rx="6" />
          <path d="M38 38h30M38 50h22M38 62h14" />
          <circle className={styles.wash} cx="108" cy="50" r="10" />
          <path className={styles.accent} d="M108 40v-8M118 50h8m-15 0 3 3 6-6" />
        </>
      ) : null}
    </svg>
  );
}

type JourneyStage = {
  kind: DrawingKind;
  title: string;
  detail: string;
  label: string;
  sdk: string;
};

type JourneyProps = {
  heading: string;
  ariaLabel: string;
  stages: readonly JourneyStage[];
  caption: string;
};

function Journey({ heading, ariaLabel, stages, caption }: JourneyProps) {
  return (
    <figure className={`not-prose ${styles.figure}`} aria-label={ariaLabel}>
      <div className={styles.heading}>{heading}</div>
      <ol className={styles.journey}>
        {stages.map((stage, index) => (
          <li key={stage.title} className={styles.stage}>
            <span className={styles.eyebrow}>{stage.label}</span>
            <SetupDrawing kind={stage.kind} />
            <span className={styles.stageTitle}>
              <span className={styles.number}>{index + 1}</span>
              {stage.title}
            </span>
            <code className={styles.sdk}>{stage.sdk}</code>
            <p>{stage.detail}</p>
          </li>
        ))}
      </ol>
      <figcaption className={styles.caption}>{caption}</figcaption>
    </figure>
  );
}

const eventStages = [
  {
    kind: "browser",
    title: "Someone visits",
    detail: "The SDK records a pageview in their browser.",
    label: "Your website",
    sdk: "@spoar/sdk",
  },
  {
    kind: "proxy",
    title: "Your app forwards it",
    detail: "Your /_ra route adds the secret key.",
    label: "Your server",
    sdk: "@spoar/sdk/proxy",
  },
  {
    kind: "database",
    title: "Spoar stores it",
    detail: "The API checks the event and saves it in Postgres.",
    label: "Your Spoar instance",
    sdk: "Spoar API",
  },
  {
    kind: "dashboard",
    title: "You see the visit",
    detail: "The dashboard reads your events through the API.",
    label: "Your dashboard",
    sdk: "@spoar/client",
  },
] as const;

const pluginStages = [
  {
    kind: "plugin",
    title: "Import a plugin",
    detail: "Pick the plugins you need. Each one adds only its own code to the bundle.",
    label: "Your code",
    sdk: "@spoar/sdk/plugins",
  },
  {
    kind: "browser",
    title: "Add it to the client",
    detail: "List it in plugins, or call analytics.use() later to add it.",
    label: "Your website",
    sdk: "@spoar/sdk",
  },
  {
    kind: "proxy",
    title: "It sends events",
    detail: "Consent and beforeSend run first. The events then join the same queue as pageviews.",
    label: "Your website",
    sdk: "@spoar/sdk",
  },
] as const;

export function EventJourney() {
  return (
    <Journey
      heading="A pageview, from start to finish"
      ariaLabel="From a page visit to your dashboard"
      stages={eventStages}
      caption="An event is a record of something that happened, such as a page visit or a signup."
    />
  );
}

export function PluginJourney() {
  return (
    <Journey
      heading="A plugin, from import to event"
      ariaLabel="From importing a plugin to the events it sends"
      stages={pluginStages}
      caption="Plugins run in the browser. Each one returns a remover, so analytics.use() can take it out again."
    />
  );
}

export function KeyPlacement() {
  return (
    <figure
      className={`not-prose ${styles.figure}`}
      aria-label="Where your public and secret keys belong"
    >
      <div className={styles.heading}>One project. Two places for its keys.</div>
      <div className={styles.keys}>
        <div className={styles.key}>
          <SetupDrawing kind="browser" />
          <span className={styles.eyebrow}>Visible to visitors</span>
          <strong>Browser settings</strong>
          <code>NEXT_PUBLIC_RA_CONFIG</code>
          <p>
            Your project id, <code>pk_...</code> public key and the path <code>/_ra</code>.
          </p>
        </div>
        <div className={styles.key}>
          <SetupDrawing kind="proxy" />
          <span className={styles.eyebrow}>Only on your server</span>
          <strong>Server settings</strong>
          <code>RA_SECRET</code>
          <p>
            Your <code>sk_...</code> secret key. The proxy uses it to send events to Spoar.
          </p>
        </div>
      </div>
      <figcaption className={styles.caption}>
        Keep the secret out of browser code. Never give it a <code>NEXT_PUBLIC_</code> prefix.
      </figcaption>
    </figure>
  );
}
