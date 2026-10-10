export const widgetCss = `
:host { all: initial; }
.spd-launcher {
  position: fixed;
  left: 16px;
  bottom: 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px 0 10px;
  border: 1px solid #262626;
  border-radius: 999px;
  background: #0b0b0b;
  color: #ededed;
  font: 500 12px/1 Geist, "Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif;
  box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.6);
  cursor: pointer;
  transition: transform 140ms cubic-bezier(0.23, 1, 0.32, 1), border-color 150ms ease;
}
.spd-launcher:hover { border-color: #3a3a3a; }
.spd-launcher:active { transform: scale(0.97); }
.spd-launcher:focus-visible { outline: 1px solid #b4b4b4; outline-offset: 2px; }
.spd-dot { width: 6px; height: 6px; border-radius: 999px; background: #e8602c; }
.spd-keys { color: #7e7e7e; font-family: "JetBrains Mono", ui-monospace, Menlo, monospace; font-size: 11px; }
.spd-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: rgba(0, 0, 0, 0.45);
  animation: spd-fade 160ms ease-out both;
}
.spd-sheet {
  position: relative;
  width: min(1200px, 100%);
  height: min(760px, 100%);
  animation: spd-rise 220ms cubic-bezier(0.23, 1, 0.32, 1) both;
}
.spd-sheet .spc-console { --spc-height: 100%; box-shadow: 0 40px 100px -30px rgba(0, 0, 0, 0.8); }
.spd-close {
  position: absolute;
  top: -12px;
  right: -12px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid #262626;
  border-radius: 999px;
  background: #111111;
  color: #b4b4b4;
  font: 14px/1 ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
}
.spd-close:hover { color: #ededed; }
.spd-close:focus-visible { outline: 1px solid #b4b4b4; outline-offset: 2px; }
@media (max-width: 640px) {
  .spd-backdrop { padding: 0; align-items: flex-end; }
  .spd-sheet { height: 88%; }
  .spd-sheet .spc-console { border-radius: 14px 14px 0 0; }
  .spd-close { top: -40px; right: 12px; }
  .spd-keys { display: none; }
}
@keyframes spd-fade { from { opacity: 0; } }
@keyframes spd-rise { from { opacity: 0; transform: translateY(8px) scale(0.985); } }
@media (prefers-reduced-motion: reduce) {
  .spd-backdrop, .spd-sheet { animation: none; }
}
`;
