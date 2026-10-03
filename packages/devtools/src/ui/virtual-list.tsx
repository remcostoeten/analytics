import type { ID, Nullable } from "@remcostoeten/analytics-shared/semantic";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { cx } from "./cx";
import { Icon } from "./icons";
import { useWindow } from "./use-window";

type Props<Item extends { id: ID }> = {
  label: string;
  columns: string;
  header: string[];
  rows: Item[];
  open: Nullable<ID>;
  selected: Nullable<ID>;
  loaded: boolean;
  empty: string;
  renderCells: (row: Item) => ReactNode;
  renderDetail?: (row: Item) => ReactNode;
  onToggle: (row: Item) => void;
};

const nearTop = 4;

export function VirtualList<Item extends { id: ID }>(props: Props<Item>) {
  const scroller = useRef<HTMLDivElement>(null);
  const keys = useMemo(() => props.rows.map((row) => row.id), [props.rows]);
  const view = useWindow(keys, scroller);
  const [unseen, setUnseen] = useState(0);
  const [stagger, setStagger] = useState(true);
  const first = useRef<Nullable<ID>>(null);
  const expandable = Boolean(props.renderDetail);

  useEffect(() => {
    if (!props.loaded) return;
    const timer = setTimeout(() => setStagger(false), 420);
    return () => clearTimeout(timer);
  }, [props.loaded]);

  useLayoutEffect(() => {
    const element = scroller.current;
    const previous = first.current;
    first.current = keys[0] ?? null;
    if (!element || previous === null || keys[0] === previous) return;
    if (element.scrollTop <= nearTop) {
      setUnseen(0);
      return;
    }
    const added = keys.indexOf(previous);
    if (added <= 0) return;
    element.scrollTop += view.offsetOf(added);
    setUnseen((value) => value + added);
  }, [keys]);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    function reset() {
      if (element && element.scrollTop <= nearTop) setUnseen(0);
    }
    element.addEventListener("scroll", reset, { passive: true });
    return () => element.removeEventListener("scroll", reset);
  }, []);

  useEffect(() => {
    const element = scroller.current;
    if (!element || props.selected === null) return;
    const index = keys.indexOf(props.selected);
    if (index < 0) return;
    const top = view.offsetOf(index);
    const bottom = top + view.sizeOf(index);
    const header = 22;
    if (top < element.scrollTop) element.scrollTop = top;
    else if (bottom > element.scrollTop + element.clientHeight - header) {
      element.scrollTop = bottom - element.clientHeight + header;
    }
  }, [props.selected]);

  function jumpToTop() {
    if (scroller.current) scroller.current.scrollTop = 0;
    setUnseen(0);
  }

  const visible = props.rows.slice(view.start, view.end);
  const style = { gridTemplateColumns: props.columns };

  return (
    <div className="list-wrap">
      <div className="list" ref={scroller} aria-label={props.label}>
        <div className="hdr" style={style} aria-hidden="true">
          {props.header.map((title, index) => (
            <span key={`${title}-${index}`}>{title}</span>
          ))}
        </div>
        {props.loaded && props.rows.length === 0 ? (
          <div className="empty">{props.empty}</div>
        ) : null}
        {!props.loaded ? <div className="empty">loading</div> : null}
        <div style={{ height: view.before }} />
        <div className={cx("items", stagger && "stagger")}>
          {visible.map((row) => {
            const open = props.open === row.id;
            const selected = props.selected === row.id;
            return (
              <div
                key={row.id}
                data-key={row.id}
                ref={view.measure}
                className={cx("item", open && "open", selected && "sel")}
              >
                {expandable ? (
                  <button
                    type="button"
                    className="row press"
                    style={style}
                    aria-expanded={open}
                    onClick={() => props.onToggle(row)}
                  >
                    {props.renderCells(row)}
                    <span className="chev">
                      <Icon name="chevron" />
                    </span>
                  </button>
                ) : (
                  <div className="row" style={style}>
                    {props.renderCells(row)}
                  </div>
                )}
                {open && props.renderDetail ? (
                  <div className="detail">{props.renderDetail(row)}</div>
                ) : null}
              </div>
            );
          })}
        </div>
        <div style={{ height: view.after }} />
      </div>
      {unseen > 0 ? (
        <button type="button" className="unseen press" onClick={jumpToTop}>
          {unseen} new
        </button>
      ) : null}
    </div>
  );
}
