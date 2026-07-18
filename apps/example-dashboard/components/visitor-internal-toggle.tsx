"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
	fingerprint: string;
	initialIsInternal: boolean;
};

export function VisitorInternalToggle({ fingerprint, initialIsInternal }: Props) {
	const [isInternal, setIsInternal] = useState(initialIsInternal);
	const [isPending, setIsPending] = useState(false);

	async function toggle() {
		const next = !isInternal;
		setIsPending(true);
		try {
			const response = await fetch(`/api/analytics/visitor/${fingerprint}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ isInternal: next }),
			});
			if (response.ok) {
				setIsInternal(next);
			}
		} finally {
			setIsPending(false);
		}
	}

	return (
		<Button
			size="sm"
			variant={isInternal ? "default" : "outline"}
			disabled={isPending}
			onClick={toggle}
			className={cn("text-xs", isInternal && "bg-amber-600 hover:bg-amber-700 text-white")}
		>
			{isInternal ? "Marked as internal / me" : "Mark as internal / me"}
		</Button>
	);
}
