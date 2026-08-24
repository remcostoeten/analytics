import { Skeleton } from "@/components/ui/skeleton";

function PanelSkeleton({ className }: { className?: string }) {
	return (
		<div className={`rounded-lg border border-border bg-card p-3 ${className ?? ""}`}>
			<Skeleton className="h-3 w-24" />
			<Skeleton className="mt-3 h-24 w-full" />
		</div>
	);
}

export function DashboardSkeleton() {
	return (
		<>
			<header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-border bg-background/80 px-4">
				<div className="flex items-center gap-2">
					<Skeleton className="size-7" />
					<Skeleton className="h-3 w-40" />
				</div>
				<Skeleton className="h-7 w-28" />
			</header>
			<div className="mx-auto w-full max-w-[1600px] space-y-4 p-4">
				<div className="space-y-2">
					<div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
						<PanelSkeleton className="h-[88px]" />
						<PanelSkeleton className="h-[88px]" />
						<PanelSkeleton className="h-[88px]" />
						<PanelSkeleton className="h-[88px]" />
					</div>
					<Skeleton className="h-9 w-full rounded-lg" />
				</div>
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
					<div className="space-y-4 lg:col-span-8">
						<PanelSkeleton className="h-[208px]" />
						<PanelSkeleton className="aspect-[2.35/1]" />
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<PanelSkeleton className="h-56" />
							<PanelSkeleton className="h-56" />
						</div>
					</div>
					<div className="space-y-4 lg:col-span-4">
						<PanelSkeleton className="h-32" />
						<PanelSkeleton className="h-[280px]" />
					</div>
				</div>
			</div>
		</>
	);
}

export function GeoSkeleton() {
	return (
		<div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 p-3 md:p-4">
			<header className="flex items-center justify-between gap-3">
				<Skeleton className="h-5 w-52" />
				<Skeleton className="h-7 w-20" />
			</header>
			<div className="grid grid-cols-2 gap-2 md:grid-cols-4">
				<PanelSkeleton className="h-16" />
				<PanelSkeleton className="h-16" />
				<PanelSkeleton className="h-16" />
				<PanelSkeleton className="h-16" />
			</div>
			<div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
				<PanelSkeleton className="aspect-[2/1] lg:col-span-2" />
				<PanelSkeleton className="h-[420px]" />
			</div>
			<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
				<PanelSkeleton className="h-48" />
				<PanelSkeleton className="h-48" />
				<PanelSkeleton className="h-48" />
				<PanelSkeleton className="h-48" />
			</div>
		</div>
	);
}
