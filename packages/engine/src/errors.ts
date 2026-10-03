import type { ErrorCode, ErrorDetails } from "@spoar/contract";

export type EngineError = {
  code: ErrorCode;
  message: string;
  details?: ErrorDetails;
  cause?: Error;
};

/**
 * @name engineError
 * @description Builds an `EngineError` for a stage, signal, enricher or adapter to return in a
 * failed `Result`. The code comes from the contract's error catalog.
 *
 * @example
 * return err(engineError("VALIDATION_FAILED", "events[0].name is empty"));
 */
export function engineError(code: ErrorCode, message: string): EngineError {
  return { code, message };
}
