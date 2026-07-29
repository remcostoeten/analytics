import { Skeleton } from "@/components/ui/skeleton";

function PanelSkeleton({ className }: { className?: string }) {
	return (
		<div className={`rounded-sm border border-border bg-card p-3 ${className ?? ""}`}>
			<Skeleton className="h-3 w-24" />
			<Skeleton className="mt-3 h-24 w-full" />
		</div>
	);
}

export function DashboardSkeleton() {
	return (
		<>
			<header className="flex h-10 items-center justify-between border-b border-border bg-card px-3">
				<Skeleton className="size-6" />
				<Skeleton className="h-7 w-40" />
			</header>
			<div className="min-h-[calc(100svh-2.5rem)] flex-1 bg-background p-3">
				<div className="space-y-3">
					<div className="space-y-2">
						<Skeleton className="h-3 w-28" />
						<Skeleton className="h-3 w-96 max-w-full" />
					</div>
					<Skeleton className="h-8 w-[34rem] max-w-full" />
					<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
						<PanelSkeleton className="h-20" />
						<PanelSkeleton className="h-20" />
						<PanelSkeleton className="h-20" />
						<PanelSkeleton className="h-20" />
					</div>
					<div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
						<div className="space-y-3 lg:col-span-8">
							<PanelSkeleton className="h-[208px]" />
							<PanelSkeleton className="aspect-[2/1]" />
							<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
								<PanelSkeleton className="h-56" />
								<PanelSkeleton className="h-56" />
							</div>
						</div>
						<div className="space-y-3 lg:col-span-4">
							<PanelSkeleton className="h-44" />
							<PanelSkeleton className="h-[400px]" />
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

export function GeoSkeleton() {
	return (
		<div className="mx-auto flex min-h-svh w-full max-w-[1400px] flex-col gap-3 p-3 md:p-4">
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
