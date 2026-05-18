/** Client-side helpers for fetch + consistent error handling. */

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error?: string; code?: string };

async function readJsonBody(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function parseJsonResponse<T>(res: Response): Promise<ApiResult<T>> {
  const body = await readJsonBody(res);

  if (res.status === 403) {
    return {
      ok: false,
      status: 403,
      code: typeof body.code === "string" ? body.code : undefined,
      error: typeof body.error === "string" ? body.error : undefined,
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: typeof body.error === "string" ? body.error : res.statusText || "Request failed",
    };
  }

  return { ok: true, data: body as T };
}
