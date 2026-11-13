"use client";

import type { Nullable } from "@spoar/shared/semantic";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { CSSProperties } from "react";

import { basePath } from "@/shared/config/site";

type Props = { id: string; name: string; domain: string };

function projectHue(id: string) {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) % 360;
  return hash;
}

async function readIcon(id: string, domain: string) {
  const query = new URLSearchParams({ domain });
  const response = await fetch(`${basePath}/project-icon/${encodeURIComponent(id)}?${query}`);
  return response.ok ? response.text() : "";
}

export function ProjectIcon({ id, name, domain }: Props) {
  const icon = useQuery({
    queryKey: ["spoar", "project-icon", id, domain],
    queryFn: () => readIcon(id, domain),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const [loaded, setLoaded] = useState<Nullable<string>>(null);
  const src = icon.data?.startsWith("data:image/") ? icon.data : null;
  const state =
    src !== null && loaded === src
      ? "loaded"
      : src === null && !icon.isPending
        ? "failed"
        : "loading";

  return (
    <span
      className="nav-avatar"
      data-state={state}
      style={{ "--avatar-hue": projectHue(id) } as CSSProperties}
      aria-hidden="true"
    >
      <span className="nav-avatar-letter">{name.slice(0, 1).toUpperCase()}</span>
      {src === null ? null : (
        <img
          ref={(image) => {
            if (image?.complete && image.naturalWidth > 0) setLoaded(src);
          }}
          src={src}
          alt=""
          width={16}
          height={16}
          decoding="async"
          onLoad={() => setLoaded(src)}
        />
      )}
    </span>
  );
}
