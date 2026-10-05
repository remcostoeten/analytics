/**
 * @name clientSignals
 * @description The bits of a wire event's `signals` field: bot hints the browser SDK collects and
 * the engine scores. `webdriver` is `navigator.webdriver`; `headless` is a zero-size outer window,
 * no languages, or a Chrome UA without `window.chrome`; `noInput` is no pointer, key, touch or
 * scroll input before the event on a page that was never visible.
 *
 * @example
 * const signals = navigator.webdriver ? clientSignals.webdriver : 0;
 */
export const clientSignals = { webdriver: 1, headless: 2, noInput: 4 } as const;

/**
 * @name botThreshold
 * @description The bot score from which an event counts as a bot: scoring, rescoring, every read
 * filter, the speed rows and the stored `bot_detected` flag compare against it.
 *
 * @example
 * const isBot = score >= botThreshold;
 */
export const botThreshold = 50;
