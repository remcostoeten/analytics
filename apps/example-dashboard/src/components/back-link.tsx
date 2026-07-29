"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type Props = {
	fallbackHref?: Route;
	label?: string;
};

export function BackLink({ fallbackHref = "/", label = "Back" }: Props) {
	const router = useRouter();

	function goBack() {
		if (window.history.length > 1) {
			router.back();
		} else {
			router.push(fallbackHref);
		}
	}

	return (
		<button
			type="button"
			onClick={goBack}
			className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
		>
			<ArrowLeft className="h-3 w-3" />
			{label}
		</button>
	);
}
