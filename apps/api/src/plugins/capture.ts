import type { Engine, Logger } from "@remcostoeten/analytics-engine";

export type Capture = (error: unknown, request: Request, requestId: string) => Promise<void>;

type Options = {
  engine: (logger: Logger) => Engine;
  logger: (requestId: string) => Logger;
  secretKey: string;
  clock: () => Date;
};

const maxIdentifier = 64;

/**
 * @name internalCapture
 * @description Records the API's own `INTERNAL` errors as `error` events in the internal project
 * whose secret key it holds, so they group into issues like any site's errors. A failed capture
 * is logged and never changes the response.
 *
 * @example
 * const capture = internalCapture({ engine, logger, secretKey, clock });
 */
export function internalCapture(options: Options): Capture {
  return async function capture(error, request, requestId) {
    const logger = options.logger(requestId);
    const failed = error instanceof Error ? error : new Error(String(error));
    const at = options.clock().toISOString();
    try {
      const result = await options.engine(logger).ingest({
        credentials: { publicKey: null, secretKey: options.secretKey },
        receivedAt: at,
        sentAt: at,
        request: { headers: new Headers(), adminSession: false },
        events: [
          {
            id: crypto.randomUUID(),
            name: "error",
            ts: at,
            visitor: "api",
            session: requestId.slice(0, maxIdentifier) || "api",
            page: { path: new URL(request.url).pathname },
            props: {
              level: "error",
              type: failed.name,
              message: failed.message,
              stack: failed.stack ?? "",
              method: request.method,
              requestId,
            },
          },
        ],
      });
      if (!result.ok) logger.warn("internal capture failed", { code: result.error.code });
    } catch (thrown) {
      logger.warn("internal capture failed", { message: String(thrown) });
    }
  };
}
