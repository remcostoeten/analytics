import type { WebUrl } from "@spoar/client";
import type { AnnotationKind } from "@spoar/contract";
import type { Nullable } from "@spoar/shared/semantic";
import { useState } from "react";
import type { FormEvent } from "react";

import { buttonClass, runClass } from "../parts/toolbar";
import type { ViewContext } from "../widget/view";

type Props = {
  context: ViewContext;
  onDone: (title: string) => void;
  onCancel: () => void;
};

const kinds: { value: AnnotationKind; label: string }[] = [
  { value: "release", label: "Release" },
  { value: "post", label: "Post" },
  { value: "content", label: "Content" },
  { value: "incident", label: "Incident" },
  { value: "other", label: "Other" },
];

const fieldClass =
  "h-6.5 min-w-0 rounded-[5px] border border-console-line bg-console-surface px-2 text-console-fg outline-none placeholder:text-console-faint focus:border-console-edge-hover";
const labelClass = "flex min-w-0 flex-col gap-1 text-console-dim";

function isKind(value: string): value is AnnotationKind {
  return kinds.some((kind) => kind.value === value);
}

function isWebUrl(value: string): value is WebUrl {
  return /^https?:\/\/\S+$/.test(value);
}

function currentUrl() {
  return typeof location === "undefined" ? "" : location.href;
}

export function AnnotateForm({ context, onDone, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<AnnotationKind>("release");
  const [note, setNote] = useState("");
  const [url, setUrl] = useState(currentUrl);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Nullable<string>>(null);

  async function send(link: Nullable<WebUrl>) {
    const client = await context.client();
    return client.annotations.create(context.project, {
      title: title.trim(),
      date: new Date(),
      kind,
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(link ? { url: link } : {}),
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setFailure("Give the annotation a title.");
      return;
    }
    const link = url.trim();
    const web = isWebUrl(link) ? link : null;
    if (link && !web) {
      setFailure("The link must start with http:// or https://.");
      return;
    }
    setSending(true);
    setFailure(null);
    void send(web).then(
      (result) => {
        setSending(false);
        if (result.ok) onDone(result.value.title);
        else setFailure(result.error.message);
      },
      () => {
        setSending(false);
        setFailure("The API could not be reached.");
      },
    );
  }

  return (
    <form
      aria-label="Add an annotation"
      className="grid basis-full grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2 border-t border-console-divider py-2 font-console-sans text-xs @max-[520px]:grid-cols-1"
      onSubmit={submit}
      noValidate
    >
      <label className={labelClass}>
        Title
        <input
          className={fieldClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          placeholder="v2.1 released"
          required
          autoFocus
        />
      </label>
      <label className={labelClass}>
        Kind
        <select
          className={`${fieldClass} cursor-pointer`}
          value={kind}
          onChange={(event) => {
            if (isKind(event.target.value)) setKind(event.target.value);
          }}
        >
          {kinds.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className={`${labelClass} col-span-full`}>
        Link
        <input
          className={fieldClass}
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          maxLength={2048}
        />
      </label>
      <label className={`${labelClass} col-span-full`}>
        Note (optional)
        <textarea
          className={`${fieldClass} h-auto min-h-12 resize-y py-1`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={2000}
          rows={2}
        />
      </label>
      <div className="col-span-full flex flex-wrap items-center gap-2">
        <button type="submit" className={runClass} disabled={sending}>
          {sending ? "Adding" : "Add annotation"}
        </button>
        <button type="button" className={buttonClass} onClick={onCancel}>
          Cancel
        </button>
        <span className="text-console-faint">Dated now</span>
        {failure ? (
          <span className="text-console-accent" role="alert">
            {failure}
          </span>
        ) : null}
      </div>
    </form>
  );
}
