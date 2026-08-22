type Unrefable = { unref?: () => void };

function unref(timer: unknown): void {
	if (timer && typeof timer === "object") (timer as Unrefable).unref?.();
}

export class TimeoutError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TimeoutError";
	}
}

export function withTimeout<TValue>(
	promise: Promise<TValue>,
	milliseconds: number,
	message: string,
): Promise<TValue> {
	if (!Number.isFinite(milliseconds) || milliseconds <= 0) return promise;

	return new Promise<TValue>((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new TimeoutError(message));
		}, milliseconds);
		unref(timer);

		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(reason: unknown) => {
				clearTimeout(timer);
				reject(reason);
			},
		);
	});
}
