"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
	fingerprint: string;
	initialIsInternal: boolean;
};

const SECRET_STORAGE_KEY = "analytics-admin-secret";

function getStoredSecret(): string | null {
	return localStorage.getItem(SECRET_STORAGE_KEY);
}

function patchVisitor(fingerprint: string, isInternal: boolean, secret: string | null): Promise<Response> {
	return fetch(`/api/analytics/visitor/${fingerprint}`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			...(secret ? { Authorization: `Bearer ${secret}` } : {}),
		},
		body: JSON.stringify({ isInternal }),
	});
}

export function VisitorInternalToggle({ fingerprint, initialIsInternal }: Props) {
	const [isInternal, setIsInternal] = useState(initialIsInternal);
	const [isPending, setIsPending] = useState(false);

	async function toggle() {
		const next = !isInternal;
		setIsPending(true);
		try {
			let response = await patchVisitor(fingerprint, next, getStoredSecret());
			if (response.status === 401) {
				const entered = window.prompt("This dashboard requires the admin secret (DASHBOARD_ADMIN_SECRET):");
				if (!entered) {
					return;
				}
				localStorage.setItem(SECRET_STORAGE_KEY, entered);
				response = await patchVisitor(fingerprint, next, entered);
				if (response.status === 401) {
					localStorage.removeItem(SECRET_STORAGE_KEY);
				}
			}
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
