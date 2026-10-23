"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { CheckIcon, ChevronDownIcon, SelectorIcon } from "./icons";

export type SelectOption<Value extends string> = { value: Value; label: string };

type Variant = "field" | "bare" | "switcher";

type Props<Value extends string> = {
  value: Value;
  options: readonly SelectOption<Value>[];
  onChange: (value: Value) => void;
  label?: string;
  id?: string;
  variant?: Variant;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
};

const triggerClass: { [Name in Variant]: string } = {
  field: "control select-trigger",
  bare: "select-trigger select-bare",
  switcher: "switcher select-trigger",
};

const typeaheadMs = 600;

/**
 * @name Select
 * @description A listbox dropdown in the dashboard's own style, in place of the native select
 * whose popup the browser draws. The trigger keeps focus and follows the select-only combobox
 * pattern: arrow keys, Home, End, Enter, Space, Escape and typing the start of a label all work.
 *
 * @example
 * <Select label="Role" value={role} options={roles} onChange={setRole} />
 */
export function Select<Value extends string>({
  value,
  options,
  onChange,
  label,
  id,
  variant = "field",
  className,
  disabled = false,
  invalid = false,
}: Props<Value>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const listId = useId();
  const selected = options.findIndex((option) => option.value === value);
  const Chevron = variant === "switcher" ? SelectorIcon : ChevronDownIcon;

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && root.current?.contains(event.target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function show() {
    setActive(Math.max(0, selected));
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
  }

  function typeahead(key: string) {
    const now = Date.now();
    const text = (now - typed.current.at > typeaheadMs ? "" : typed.current.text) + key;
    typed.current = { text, at: now };
    const match = options.findIndex((option) =>
      option.label.toLowerCase().startsWith(text.toLowerCase()),
    );
    if (match >= 0) setActive(match);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const last = options.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        show();
      }
      return;
    }
    if (event.key === "ArrowDown") setActive((index) => Math.min(last, index + 1));
    else if (event.key === "ArrowUp") setActive((index) => Math.max(0, index - 1));
    else if (event.key === "Home") setActive(0);
    else if (event.key === "End") setActive(last);
    else if (event.key === "Enter" || (event.key === " " && typed.current.text === "")) {
      choose(active);
    } else if (event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
      return;
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      typeahead(event.key);
    } else {
      return;
    }
    event.preventDefault();
  }

  return (
    <div ref={root} className={variant === "bare" ? "relative" : "relative w-full"}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-label={label}
        aria-invalid={invalid ? "true" : undefined}
        disabled={disabled}
        className={className ? `${triggerClass[variant]} ${className}` : triggerClass[variant]}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
      >
        <span className="min-w-0 flex-1 truncate">{options[selected]?.label ?? ""}</span>
        <Chevron className="size-3.5 shrink-0 text-muted" />
      </button>
      {open ? (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-label={label}
          className="popover select-list"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === selected}
              data-active={index === active}
              className="select-option"
              onPointerEnter={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.preventDefault();
                choose(index);
              }}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {index === selected ? <CheckIcon className="size-3.5 shrink-0 text-accent" /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
