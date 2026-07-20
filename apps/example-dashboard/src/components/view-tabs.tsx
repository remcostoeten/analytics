"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import type { Route } from "next";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { cn } from "@/lib/utils";

export type AnimatedIconHandle = {
	startAnimation: () => void;
	stopAnimation: () => void;
};

type TabIcon = ForwardRefExoticComponent<
	{ className?: string; size?: number } & RefAttributes<AnimatedIconHandle>
>;

type TabItem<T extends string> = {
	id: T;
	label: string;
	icon: TabIcon;
};

type Props<T extends string> = {
	tabs: TabItem<T>[];
	activeId: T;
	hrefFor: (id: T) => Route;
	ariaLabel: string;
};

type Rect = {
	left: number;
	width: number;
};

function measure(container: HTMLElement, el: HTMLElement): Rect {
	const containerBox = container.getBoundingClientRect();
	const box = el.getBoundingClientRect();
	return { left: box.left - containerBox.left, width: box.width };
}

export function ViewTabs<T extends string>({ tabs, activeId, hrefFor, ariaLabel }: Props<T>) {
	const listRef = useRef<HTMLDivElement>(null);
	const tabRefs = useRef(new Map<T, HTMLAnchorElement>());
	const iconRefs = useRef(new Map<T, AnimatedIconHandle>());
	const [activeRect, setActiveRect] = useState<Rect | null>(null);
	const [hoverRect, setHoverRect] = useState<Rect | null>(null);
	const [hoverSettled, setHoverSettled] = useState(false);

	useLayoutEffect(() => {
		const container = listRef.current;
		const el = tabRefs.current.get(activeId);
		if (!container || !el) return;

		function sync() {
			if (!container || !el) return;
			setActiveRect(measure(container, el));
		}

		sync();
		const observer = new ResizeObserver(() => sync());
		observer.observe(container);
		return () => observer.disconnect();
	}, [activeId]);

	function handleTabHover(id: T) {
		const container = listRef.current;
		const el = tabRefs.current.get(id);
		if (!container || !el) return;
		setHoverRect(measure(container, el));
		requestAnimationFrame(() => setHoverSettled(true));
		iconRefs.current.get(id)?.startAnimation();
	}

	function handleTabLeave(id: T) {
		iconRefs.current.get(id)?.stopAnimation();
	}

	function handleListLeave() {
		setHoverRect(null);
		setHoverSettled(false);
	}

	function indicatorStyle(rect: Rect) {
		return {
			transform: `translateX(${rect.left}px)`,
			width: rect.width,
		};
	}

	return (
		<div
			ref={listRef}
			role="tablist"
			aria-label={ariaLabel}
			onMouseLeave={handleListLeave}
			className="relative flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit min-w-full"
		>
			{hoverRect && (
				<div
					aria-hidden
					className={cn(
						"absolute inset-y-1 left-0 rounded-md bg-foreground/[0.06]",
						hoverSettled
							? "transition-[transform,width,opacity] duration-200 ease-out"
							: "opacity-0",
					)}
					style={indicatorStyle(hoverRect)}
				/>
			)}
			{activeRect && (
				<div
					aria-hidden
					className="absolute inset-y-1 left-0 rounded-md bg-background shadow-sm transition-[transform,width] duration-300 ease-[cubic-bezier(0.3,0.9,0.3,1)]"
					style={indicatorStyle(activeRect)}
				/>
			)}
			{tabs.map((tab) => (
				<Link
					key={tab.id}
					ref={(el) => {
						if (el) {
							tabRefs.current.set(tab.id, el);
						} else {
							tabRefs.current.delete(tab.id);
						}
					}}
					href={hrefFor(tab.id)}
					role="tab"
					aria-selected={activeId === tab.id}
					onMouseEnter={() => handleTabHover(tab.id)}
					onMouseLeave={() => handleTabLeave(tab.id)}
					onFocus={() => handleTabHover(tab.id)}
					onBlur={() => handleTabLeave(tab.id)}
					className={cn(
						"relative z-[1] flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap",
						activeId === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
					)}
				>
					<tab.icon
						ref={(handle) => {
							if (handle) {
								iconRefs.current.set(tab.id, handle);
							} else {
								iconRefs.current.delete(tab.id);
							}
						}}
						size={14}
						className="flex items-center"
					/>
					{tab.label}
				</Link>
			))}
		</div>
	);
}
