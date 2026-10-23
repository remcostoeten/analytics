import type { FocusEvent, PointerEvent } from "react";

function playIconMotion(host: HTMLElement) {
  const icon = host.querySelector<SVGSVGElement>("svg[data-motion]");
  if (!icon || icon.dataset.playing === "true") return;
  icon.dataset.playing = "true";
  const running = icon.getAnimations({ subtree: true });
  void Promise.allSettled(running.map((animation) => animation.finished)).then(() => {
    delete icon.dataset.playing;
  });
}

/**
 * @name iconMotionHandlers
 * @description Event handlers that play the icon motion inside an element once on mouse or pen
 * hover and on keyboard focus. The motion runs to its end when the pointer leaves, and a run in
 * progress is not restarted. Spread them on a link or button that holds an animated icon.
 *
 * @example
 * <Link href="/" {...iconMotionHandlers}><HomeIcon /></Link>
 */
export const iconMotionHandlers = {
  onPointerEnter: (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "touch") playIconMotion(event.currentTarget);
  },
  onFocus: (event: FocusEvent<HTMLElement>) => {
    if (event.currentTarget.matches(":focus-visible")) playIconMotion(event.currentTarget);
  },
};
