"use client";

import { useId, useState } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";

import { CloseIcon } from "./icons";

type Props = {
  id: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  normalize?: (raw: string) => string;
  isValid?: (value: string) => boolean;
  suggestions?: string[];
  invalid?: boolean;
  mono?: boolean;
};

const separators = /[\s,]+/;

export function TagInput({
  id,
  values,
  onChange,
  placeholder,
  normalize = (raw) => raw.trim(),
  isValid = () => true,
  suggestions = [],
  invalid = false,
  mono = true,
}: Props) {
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const query = text.trim().toLowerCase();
  const options = suggestions
    .filter((option) => !values.includes(option) && option.toLowerCase().includes(query))
    .slice(0, 6);
  const open = query.length > 0 && options.length > 0;

  function add(raws: string[]) {
    const next = [...values];
    for (const raw of raws) {
      const value = normalize(raw);
      if (value.length > 0 && !next.includes(value)) next.push(value);
    }
    if (next.length !== values.length) onChange(next);
    setText("");
    setActive(0);
  }

  function remove(value: string) {
    onChange(values.filter((current) => current !== value));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + options.length) % options.length);
      return;
    }
    if (event.key === "Enter" || event.key === "," || (event.key === "Tab" && text.trim())) {
      if (event.key === "Enter" && text.trim().length === 0) return;
      event.preventDefault();
      add([open ? (options[active] ?? text) : text]);
      return;
    }
    if (event.key === "Escape" && text.length > 0) {
      event.preventDefault();
      setText("");
      return;
    }
    if (event.key === "Backspace" && text.length === 0 && values.length > 0) {
      event.preventDefault();
      const last = values.at(-1) ?? "";
      onChange(values.slice(0, -1));
      setText(last);
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    if (!separators.test(pasted.trim())) return;
    event.preventDefault();
    add(pasted.split(separators));
  }

  return (
    <div className="relative">
      <div
        className="control tag-input"
        data-mono={mono ? "" : undefined}
        aria-invalid={invalid ? "true" : undefined}
      >
        {values.map((value) => (
          <span key={value} className="tag" data-invalid={isValid(value) ? undefined : ""}>
            <span className="truncate">{value}</span>
            <button
              type="button"
              className="tag-remove"
              aria-label={`Remove ${value}`}
              onClick={() => remove(value)}
            >
              <CloseIcon className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          className="tag-input-field"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          placeholder={values.length === 0 ? placeholder : "Add another"}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => {
            if (text.trim()) add([text]);
          }}
        />
      </div>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="popover absolute inset-x-0 top-full z-20 mt-1 p-1"
        >
          {options.map((option, index) => (
            <li
              key={option}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className="tag-option"
              onMouseDown={(event) => {
                event.preventDefault();
                add([option]);
              }}
              onMouseEnter={() => setActive(index)}
            >
              {option}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
