"use client";

import { notify } from "@remcostoeten/notifier";
import type { AnnotationKind } from "@spoar/contract";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { PlusCircleIcon } from "@/shared/ui/icons";

import { createAnnotation } from "../actions";
import { annotationKinds, calendarDay, isCalendarDate, kindLabels } from "../annotations";

type Props = { project: string };

function isKind(value: string): value is AnnotationKind {
  return annotationKinds.some((kind) => kind === value);
}

export function AddAnnotation({ project }: Props) {
  const router = useRouter();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => calendarDay(new Date().toISOString()));
  const [endDate, setEndDate] = useState("");
  const [kind, setKind] = useState<AnnotationKind>("release");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && root.current?.contains(event.target)) return;
      setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        className="filter-button"
        onClick={() => setOpen((value) => !value)}
      >
        <PlusCircleIcon className="size-3.5" />
        Annotate
      </button>
      {open ? (
        <form
          id={id}
          className="popover absolute top-[calc(100%+6px)] right-0 z-20 grid w-72 gap-3 p-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const trimmed = title.trim();
            if (!trimmed || !isCalendarDate(date)) return;
            setBusy(true);
            const result = await createAnnotation(project, {
              title: trimmed,
              date,
              endDate: isCalendarDate(endDate) ? endDate : null,
              kind,
              note: note.trim() ? note.trim() : null,
            });
            setBusy(false);
            if (!result.ok) {
              notify.error(result.error.message);
              return;
            }
            notify.success("Annotation added");
            setOpen(false);
            setTitle("");
            setNote("");
            setEndDate("");
            router.refresh();
          }}
        >
          <label className="grid gap-1 text-xs text-muted">
            Title
            <input
              className="control"
              value={title}
              maxLength={120}
              required
              autoFocus
              onChange={(event) => setTitle(event.target.value)}
              placeholder="v2.0 released"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs text-muted">
              Date (UTC)
              <input
                className="control"
                type="date"
                value={date}
                required
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted">
              End date
              <input
                className="control"
                type="date"
                value={endDate}
                min={date}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
          </div>
          <label className="grid gap-1 text-xs text-muted">
            Kind
            <select
              className="control"
              value={kind}
              onChange={(event) => {
                if (isKind(event.target.value)) setKind(event.target.value);
              }}
            >
              {annotationKinds.map((entry) => (
                <option key={entry} value={entry}>
                  {kindLabels[entry]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-muted">
            Note
            <textarea
              className="control min-h-16"
              value={note}
              maxLength={2000}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="ghost-button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="solid-button" disabled={busy}>
              {busy ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
