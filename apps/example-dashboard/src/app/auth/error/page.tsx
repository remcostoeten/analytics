import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { getAuthErrorCopy, isAuthErrorCode } from "@/lib/auth-errors";

export const metadata: Metadata = {
	title: "Sign-in failed",
};

type Props = {
	searchParams: Promise<{ code?: string; login?: string }>;
};

export default function AuthErrorPage({ searchParams }: Props) {
	return (
		<main className="flex min-h-svh items-center justify-center bg-background p-6">
			<Suspense fallback={<Empty className="w-full max-w-md border border-border bg-card" />}>
				<AuthErrorCard searchParams={searchParams} />
			</Suspense>
		</main>
	);
}

async function AuthErrorCard({ searchParams }: Props) {
	const { code, login } = await searchParams;
	const resolvedCode = isAuthErrorCode(code) ? code : "unexpected";
	const copy = getAuthErrorCopy(resolvedCode, login);
	const canRetry = resolvedCode !== "not_allowed";

	return (
			<Empty className="w-full max-w-md border border-border bg-card">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<ShieldAlert className="text-destructive" />
					</EmptyMedia>
					<EmptyTitle>{copy.title}</EmptyTitle>
					<EmptyDescription>{copy.description}</EmptyDescription>
				</EmptyHeader>
				<EmptyContent className="flex-row justify-center gap-2">
					{canRetry && (
						<Button asChild size="sm">
							<a href="/api/auth/login">Try again</a>
						</Button>
					)}
					<Button asChild size="sm" variant={canRetry ? "outline" : "default"}>
						<Link href="/">Back to dashboard</Link>
					</Button>
				</EmptyContent>
				<p className="text-[11px] text-muted-foreground">
					Error code: <code className="font-mono">{resolvedCode}</code>
				</p>
			</Empty>
	);
}
