import type { ReactNode, RefObject } from "react";

type Props = {
  label: string;
  value: string;
  placeholder: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  children?: ReactNode;
};

export function FilterPrompt(props: Props) {
  return (
    <div className="toolbar">
      <span className="caret" aria-hidden="true">
        ›
      </span>
      <input
        ref={props.inputRef}
        value={props.value}
        placeholder={props.placeholder}
        aria-label={props.label}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => props.onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape" && event.key !== "Enter") return;
          event.stopPropagation();
          if (event.key === "Escape" && props.value.length > 0) props.onChange("");
          else event.currentTarget.blur();
        }}
      />
      {props.children}
    </div>
  );
}
