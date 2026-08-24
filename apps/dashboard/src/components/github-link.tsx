import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const GITHUB_REPO_URL = "https://github.com/remcostoeten/analytics";

type GithubMarkProps = {
	className?: string;
};

export function GithubMark({ className }: GithubMarkProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			aria-hidden
			fill="currentColor"
			className={cn("h-3.5 w-3.5", className)}
		>
			<path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11.02 11.02 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14 0 1.54-.01 2.79-.01 3.17 0 .31.21.67.8.55C20.21 21.38 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
		</svg>
	);
}

type GithubLinkProps = {
	className?: string;
};

export function GithubLink({ className }: GithubLinkProps) {
	return (
		<Button
			variant="ghost"
			size="sm"
			asChild
			className={cn("h-7 w-7 px-0 text-muted-foreground hover:text-foreground", className)}
		>
			<a
				href={GITHUB_REPO_URL}
				target="_blank"
				rel="noopener noreferrer"
				title="View source on GitHub"
				aria-label="View source on GitHub"
			>
				<GithubMark />
			</a>
		</Button>
	);
}
