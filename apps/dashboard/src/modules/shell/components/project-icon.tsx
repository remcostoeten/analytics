"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

type Props = { id: string; name: string; domain: string };

const localHosts = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/;

function projectHue(id: string) {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) % 360;
  return hash;
}

function faviconUrl(domain: string) {
  const host = domain.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  if (!host || localHosts.test(host)) return null;
  return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`;
}

export function ProjectIcon({ id, name, domain }: Props) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const src = faviconUrl(domain);
  const showImage = src !== null && state !== "failed";

  return (
    <span
      className="nav-avatar"
      data-state={showImage ? state : "failed"}
      style={{ "--avatar-hue": projectHue(id) } as CSSProperties}
      aria-hidden="true"
    >
      <span className="nav-avatar-letter">{name.slice(0, 1).toUpperCase()}</span>
      {showImage ? (
        <img
          ref={(image) => {
            if (image?.complete) setState(image.naturalWidth > 0 ? "loaded" : "failed");
          }}
          src={src}
          alt=""
          width={16}
          height={16}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
        />
      ) : null}
    </span>
  );
}
