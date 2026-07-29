"use client";

import { useEffect, useState } from "react";

export function useCommandPalette() {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		function handler(event: KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && event.key === "k") {
				event.preventDefault();
				setOpen((previous) => !previous);
			}
		}

		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, []);

	return { open, setOpen };
}
