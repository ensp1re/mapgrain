export class HarnessError extends Error {
  readonly exitCode: number;
  readonly details: unknown;

  constructor(message: string, exitCode = 2, details?: unknown) {
    super(message);
    this.name = "HarnessError";
    this.exitCode = exitCode;
    this.details = details;
  }
}

export function failResult(
  message: string,
  exitCode = 2,
  extra: Record<string, unknown> = {},
) {
  return {
    payload: { ok: false, error: message, errors: [message], ...extra },
    exitCode,
  };
}
