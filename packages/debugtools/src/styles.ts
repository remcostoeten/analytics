export const css = `
.spc-console {
  --spc-bg: #0b0b0b;
  --spc-surface: #111111;
  --spc-raised: #1a1a1a;
  --spc-hover: rgba(255, 255, 255, 0.05);
  --spc-border: #222222;
  --spc-divider: #1c1c1c;
  --spc-text: #ededed;
  --spc-muted: #b4b4b4;
  --spc-dim: #7e7e7e;
  --spc-faint: #4a4a4a;
  --spc-accent: #e8602c;
  --spc-string: #f3a26a;
  --spc-keyword: #7cb2f2;
  --spc-number: #e6db6a;
  --spc-sans: Geist, "Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif;
  --spc-mono: "Berkeley Mono", "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  --spc-radius: 10px;
  --spc-height: 640px;

  position: relative;
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  height: var(--spc-height);
  overflow: hidden;
  border: 1px solid var(--spc-border);
  border-radius: var(--spc-radius);
  background: var(--spc-bg);
  color: var(--spc-text);
  font-family: var(--spc-sans);
  font-size: 13px;
  line-height: 1.4;
  text-align: left;
  -webkit-font-smoothing: antialiased;
}
:where(.spc-console) *, :where(.spc-console) *::before, :where(.spc-console) *::after { box-sizing: border-box; }
:where(.spc-console) button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
.spc-console button:focus-visible, .spc-console input:focus-visible { outline: 1px solid var(--spc-muted); outline-offset: 1px; }
:where(.spc-console) p { margin: 0; }
.spc-icon { flex: none; display: block; }

.spc-nav { display: flex; align-items: stretch; height: 40px; border-bottom: 1px solid var(--spc-divider); }
.spc-logo { display: grid; place-items: center; width: 40px; color: var(--spc-text); }
.spc-nav-tabs { display: flex; overflow-x: auto; scrollbar-width: none; }
.spc-nav-tab { position: relative; padding: 0 12px; color: var(--spc-muted); white-space: nowrap; transition: color 120ms ease; }
.spc-nav-tab:hover { color: var(--spc-text); }
.spc-nav-tab[aria-selected="true"] { color: var(--spc-text); background: var(--spc-surface); }
.spc-nav-tab[aria-selected="true"]::before { content: ""; position: absolute; inset: 0 0 auto; height: 1px; background: var(--spc-text); }

.spc-toolbar { position: relative; display: flex; align-items: center; gap: 6px; height: 44px; padding: 0 8px; border-bottom: 1px solid var(--spc-divider); overflow-x: auto; scrollbar-width: none; }
.spc-segmented { display: flex; gap: 2px; padding: 2px; border-radius: 6px; }
.spc-segmented button, .spc-button { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 8px; border-radius: 5px; color: var(--spc-muted); white-space: nowrap; transition: background-color 120ms ease, color 120ms ease; }
.spc-segmented button:hover, .spc-button:not(:disabled):hover { color: var(--spc-text); background: var(--spc-hover); }
.spc-segmented button[aria-pressed="true"] { color: var(--spc-text); background: var(--spc-raised); }
.spc-button { border: 1px solid var(--spc-border); }
.spc-button:disabled { cursor: default; color: var(--spc-faint); }
.spc-run { color: #0b0b0b; background: var(--spc-text); border-color: var(--spc-text); }
.spc-run:hover { color: #0b0b0b; background: #ffffff; }
.spc-run:active { transform: scale(0.97); }
.spc-toolbar[data-running="true"] .spc-run { background: var(--spc-muted); border-color: var(--spc-muted); }
.spc-square { width: 26px; justify-content: center; padding: 0; }
.spc-divider { flex: none; width: 1px; height: 18px; margin: 0 4px; background: var(--spc-border); }
.spc-progress { position: absolute; left: 0; bottom: -1px; height: 1px; width: 100%; background: linear-gradient(90deg, transparent, var(--spc-accent), transparent); background-size: 40% 100%; background-repeat: no-repeat; opacity: 0; }
.spc-toolbar[data-running="true"] .spc-progress { opacity: 1; animation: spc-sweep 900ms linear infinite; }
@keyframes spc-sweep { from { background-position: -40% 0; } to { background-position: 140% 0; } }

.spc-editor { position: relative; display: flex; height: 140px; flex: none; padding: 10px 0; overflow: hidden; font-family: var(--spc-mono); font-size: 12.5px; line-height: 20px; border-bottom: 1px solid var(--spc-divider); }
.spc-gutter { display: flex; flex-direction: column; flex: none; width: 52px; padding: 0 8px 0 10px; color: var(--spc-dim); text-align: right; }
.spc-gutter span { padding-right: 10px; border-radius: 3px; }
.spc-gutter span[data-current="true"] { color: var(--spc-muted); background: var(--spc-raised); }
.spc-code { flex: 1; min-width: 0; margin: 0; padding-left: 14px; font: inherit; white-space: pre; overflow: hidden; }
.spc-line { min-height: 20px; }
.spc-token-keyword, .spc-token-operator { color: var(--spc-keyword); }
.spc-token-string { color: var(--spc-string); }
.spc-token-number { color: var(--spc-number); }
.spc-token-plain { color: var(--spc-text); }
.spc-caret { display: inline-block; width: 1px; height: 15px; margin-left: 1px; vertical-align: -3px; background: var(--spc-text); }
.spc-scrollbar { position: absolute; top: 8px; right: 6px; width: 3px; height: 32px; border-radius: 2px; background: var(--spc-border); }

.spc-results-bar { display: flex; align-items: stretch; height: 34px; flex: none; border-bottom: 1px solid var(--spc-divider); color: var(--spc-dim); }
.spc-results-grid { display: grid; place-items: center; width: 40px; border-right: 1px solid var(--spc-divider); color: var(--spc-muted); }
.spc-results-tab { display: flex; align-items: center; padding: 0 18px; border-right: 1px solid var(--spc-divider); }
.spc-results-collapse { display: grid; place-items: center; width: 34px; margin-left: auto; }

.spc-panes { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); flex: 1; min-height: 0; }
.spc-library, .spc-side { position: relative; display: flex; flex-direction: column; min-height: 0; min-width: 0; }
.spc-library { border-right: 1px solid var(--spc-divider); }
.spc-pane-head { display: flex; align-items: center; justify-content: space-between; height: 38px; flex: none; padding: 0 10px 0 12px; border-bottom: 1px solid var(--spc-divider); }
.spc-icon-button { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 4px; color: var(--spc-muted); }
.spc-icon-button:hover { color: var(--spc-text); background: var(--spc-hover); }
.spc-columns { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); flex: 1; min-height: 0; }
.spc-column { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
.spc-column + .spc-column { border-left: 1px solid var(--spc-divider); }
.spc-search { display: flex; align-items: center; gap: 8px; height: 38px; flex: none; padding: 0 12px; border-bottom: 1px solid var(--spc-divider); color: var(--spc-dim); }
.spc-search input { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: none; color: var(--spc-text); font: inherit; font-size: 12.5px; }
.spc-search input:focus-visible { outline: 0; }
.spc-search:focus-within { color: var(--spc-muted); }
.spc-search input::placeholder { color: var(--spc-dim); }
.spc-list { flex: 1; min-height: 0; overflow-y: auto; padding: 6px; scrollbar-width: none; font-family: var(--spc-mono); font-size: 12px; }
.spc-fade { mask-image: linear-gradient(to bottom, #000 55%, transparent 98%); }
.spc-caption { display: block; padding: 6px 6px 3px; color: var(--spc-dim); font-size: 11.5px; }
.spc-row { display: flex; align-items: center; gap: 8px; width: 100%; height: 26px; padding: 0 6px; border-radius: 5px; color: var(--spc-muted); text-align: left; }
button.spc-row:hover { color: var(--spc-text); background: var(--spc-hover); }
.spc-row[aria-current="true"] { color: var(--spc-text); background: var(--spc-raised); }
.spc-row .spc-icon { color: var(--spc-dim); }
.spc-row-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.spc-field { cursor: default; }
.spc-badge { display: grid; place-items: center; width: 14px; height: 14px; border-radius: 3px; background: var(--spc-raised); color: var(--spc-dim); font-size: 9px; }

.spc-select { display: inline-flex; align-items: center; gap: 6px; color: var(--spc-muted); }
.spc-actions { display: flex; gap: 2px; color: var(--spc-dim); }
.spc-action { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 4px; }
.spc-action[data-active="true"] { color: var(--spc-text); background: var(--spc-raised); }
.spc-recent { flex: 1; min-height: 0; overflow: hidden; padding: 10px 12px; font-family: var(--spc-mono); font-size: 11.5px; opacity: 0.55; }
.spc-recent-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0 12px; border-bottom: 1px solid var(--spc-divider); color: var(--spc-dim); }
.spc-recent-code { flex: 1; min-width: 0; white-space: pre; overflow: hidden; }
.spc-recent-line { display: flex; gap: 10px; line-height: 19px; }
.spc-recent-number { width: 10px; color: var(--spc-faint); text-align: right; }

.spc-agent { position: absolute; top: 46px; right: 12px; bottom: 12px; left: 32px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--spc-border); border-radius: 8px; background: var(--spc-surface); box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.7); font-family: var(--spc-mono); font-size: 12px; line-height: 1.6; }
.spc-agent-head { display: flex; align-items: center; gap: 12px; height: 32px; flex: none; padding: 0 12px; border-bottom: 1px solid var(--spc-divider); color: var(--spc-dim); }
.spc-dots { display: flex; gap: 6px; }
.spc-dots span { width: 9px; height: 9px; border-radius: 50%; background: var(--spc-faint); }
.spc-transcript { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: none; display: flex; flex-direction: column-reverse; }
.spc-transcript-body { flex: 1 0 auto; display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; color: var(--spc-muted); }
.spc-prompt { padding: 4px 8px; margin: 0 -4px 4px; border-radius: 3px; background: var(--spc-raised); color: var(--spc-text); }
.spc-step { animation: spc-rise 260ms cubic-bezier(0.23, 1, 0.32, 1) both; }
.spc-step strong { color: var(--spc-text); font-weight: 500; }
.spc-step-status { display: flex; gap: 8px; }
.spc-chevron { color: var(--spc-accent); }
.spc-step-bullet { display: flex; gap: 8px; }
.spc-thinking { color: var(--spc-dim); background: linear-gradient(90deg, var(--spc-dim) 30%, var(--spc-text) 50%, var(--spc-dim) 70%); background-size: 250% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: spc-rise 260ms cubic-bezier(0.23, 1, 0.32, 1) both, spc-shimmer 1.4s linear infinite; }
.spc-input { flex: none; padding: 8px 12px; border-top: 1px solid var(--spc-divider); color: var(--spc-text); white-space: pre-wrap; }
.spc-block-caret { display: inline-block; width: 7px; height: 14px; margin-left: 1px; vertical-align: -2px; background: var(--spc-text); animation: spc-blink 1s steps(1) infinite; }
.spc-agent-foot { flex: none; padding: 7px 12px; border-top: 1px solid var(--spc-divider); color: var(--spc-dim); font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@keyframes spc-rise { from { opacity: 0; transform: translateY(4px); } }
@keyframes spc-shimmer { from { background-position: 100% 0; } to { background-position: -150% 0; } }
@keyframes spc-blink { 50% { opacity: 0; } }

@container (max-width: 860px) {
  .spc-panes { grid-template-columns: minmax(0, 1fr); }
  .spc-library { display: none; }
  .spc-agent { left: 12px; }
}
@container (max-width: 520px) {
  .spc-editor { font-size: 11.5px; }
  .spc-divider, .spc-quiet { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .spc-step, .spc-thinking, .spc-block-caret, .spc-toolbar[data-running="true"] .spc-progress { animation: none; }
}
`;
