import { useEffect, useRef } from "react";

export type Action = {
  label: string;
  run: () => void;
};

type Props = {
  actions: Action[];
  onClose: () => void;
};

export function RowMenu({ actions, onClose }: Props) {
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    menu.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, []);

  function move(delta: number) {
    const items = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const root = menu.current?.getRootNode();
    const focused =
      root instanceof ShadowRoot || root instanceof Document ? root.activeElement : null;
    const active = items.findIndex((item) => item === focused);
    const next = items[(active + delta + items.length) % items.length];
    next?.focus();
  }

  return (
    <div
      ref={menu}
      className="menu"
      role="menu"
      aria-label="Row actions"
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") onClose();
        if (event.key === "ArrowDown" || event.key === "j") move(1);
        if (event.key === "ArrowUp" || event.key === "k") move(-1);
      }}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !menu.current?.contains(next)) onClose();
      }}
    >
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          role="menuitem"
          className="menu-item"
          onClick={() => {
            action.run();
            onClose();
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

export function ActionBar({ actions }: { actions: Action[] }) {
  return (
    <div className="actions">
      {actions.map((action) => (
        <button key={action.label} type="button" className="tb press" onClick={action.run}>
          {action.label}
        </button>
      ))}
    </div>
  );
}
