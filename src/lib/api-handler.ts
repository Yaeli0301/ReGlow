import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";

type RouteHandler = (
  request: Request,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse>;

export function apiRoute(
  handler: RouteHandler,
  options?: { label?: string }
): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error, options?.label);
    }
  };
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function logRouteStart(label: string, meta?: Record<string, unknown>) {
  logger.debug(`Route start: ${label}`, meta);
}
