import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SchedulingConflictError } from "@/lib/scheduling";
import { logger } from "@/lib/logger";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "PAYMENT_FAILED"
  | "DEMO_ONLY"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly userMessage: string;
  readonly expose: boolean;

  constructor(params: {
    code: ErrorCode;
    message: string;
    userMessage?: string;
    status?: number;
    expose?: boolean;
  }) {
    super(params.message);
    this.name = "AppError";
    this.code = params.code;
    this.status = params.status ?? statusForCode(params.code);
    this.userMessage = params.userMessage ?? params.message;
    this.expose = params.expose ?? true;
  }
}

function statusForCode(code: ErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
    case "DEMO_ONLY":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "PAYMENT_FAILED":
      return 402;
    default:
      return 500;
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof AppError && error.expose) return error.userMessage;
  if (error instanceof SchedulingConflictError) return error.message;
  if (error instanceof ZodError) {
    return error.issues[0]?.message || "קלט לא תקין";
  }
  if (error instanceof Error && error.message.includes("not found")) {
    return "הפריט לא נמצא";
  }
  return "משהו השתבש. נסי שוב בעוד רגע.";
}

export function handleApiError(error: unknown, context?: string): NextResponse {
  logger.error(context || "API error", {
    err: error instanceof Error ? error.message : String(error),
    code: error instanceof AppError ? error.code : undefined,
  });

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.userMessage, code: error.code },
      { status: error.status }
    );
  }
  if (error instanceof SchedulingConflictError) {
    return NextResponse.json(
      { error: error.message, code: "CONFLICT" },
      { status: 409 }
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: toUserMessage(error), code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: toUserMessage(error), code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; delayMs?: number; label?: string } = {}
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const delayMs = options.delayMs ?? 400;
  let lastError: unknown;

  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < attempts) {
        logger.warn(`Retry ${options.label || "operation"} (${i}/${attempts})`, {
          err: e instanceof Error ? e.message : String(e),
        });
        await new Promise((r) => setTimeout(r, delayMs * i));
      }
    }
  }
  throw lastError;
}
