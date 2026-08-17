import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

type RequestContext = {
  requestId: string;
  route: string;
};

type DatabaseError = Error & {
  code?: string;
  severity?: string;
};

type Logger = Pick<Console, "info" | "warn" | "error">;

const requestContext = new AsyncLocalStorage<RequestContext>();
const instanceState = { activeOperations: 0 };

function observabilityEnabled() {
  return process.env.DB_OBSERVABILITY === "1";
}

export function createRequestId() {
  return randomUUID().replaceAll("-", "").slice(0, 8);
}

export function classifyDatabaseDuration(durationMs: number) {
  if (durationMs > 30_000) return "DB_STALLED";
  if (durationMs > 5_000) return "DB_VERY_SLOW";
  if (durationMs > 1_000) return "DB_SLOW";
  return "DB";
}

export function sanitizeDatabaseMessage(message: string) {
  return message
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[DATABASE_URL_REMOVED]")
    .replace(/(DATABASE_URL\s*[=:]\s*)\S+/gi, "$1[REMOVED]")
    .replace(/(password\s*[=:]\s*)\S+/gi, "$1[REMOVED]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 240);
}

function logLine(
  logger: Logger,
  level: keyof Logger,
  marker: string,
  fields: Record<string, string | number | boolean | undefined>,
) {
  const details = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${String(value).replaceAll(" ", "_")}`)
    .join(" ");
  logger[level](`[${marker}] ${details}`);
}

export async function observeDatabaseOperation<T>(
  operation: string,
  callback: () => Promise<T>,
  options: { logger?: Logger; now?: () => number } = {},
): Promise<T> {
  const logger = options.logger ?? console;
  const now = options.now ?? Date.now;
  const context = requestContext.getStore() ?? { requestId: createRequestId(), route: "unscoped" };
  const requestedAt = now();
  const activeBefore = instanceState.activeOperations;
  instanceState.activeOperations += 1;
  let slowTimer: ReturnType<typeof setTimeout> | undefined;

  const scheduleWarning = (delayMs: number, marker: "DB_SLOW" | "DB_VERY_SLOW" | "DB_STALLED", next?: () => void) => {
    slowTimer = setTimeout(() => {
      logLine(logger, "warn", marker, {
        req: context.requestId,
        route: context.route,
        op: operation,
        duration: `${Math.max(0, now() - requestedAt)}ms`,
        status: "waiting",
        concurrent_at_start: activeBefore,
        at: new Date().toISOString(),
      });
      next?.();
    }, delayMs);
    slowTimer.unref?.();
  };

  scheduleWarning(1_000, "DB_SLOW", () =>
    scheduleWarning(4_000, "DB_VERY_SLOW", () =>
      scheduleWarning(25_000, "DB_STALLED")));

  if (observabilityEnabled()) {
    logLine(logger, "info", "DB_START", {
      req: context.requestId,
      route: context.route,
      op: operation,
      active: instanceState.activeOperations,
      queued_estimate: activeBefore,
      at: new Date().toISOString(),
    });
  }

  try {
    const result = await callback();
    const durationMs = Math.max(0, now() - requestedAt);
    const marker = classifyDatabaseDuration(durationMs);
    if (observabilityEnabled() || marker !== "DB") {
      logLine(logger, marker === "DB" ? "info" : "warn", marker, {
        req: context.requestId,
        route: context.route,
        op: operation,
        duration: `${durationMs}ms`,
        status: "ok",
        concurrent_at_start: activeBefore,
        at: new Date().toISOString(),
      });
    }
    return result;
  } catch (error) {
    const durationMs = Math.max(0, now() - requestedAt);
    const databaseError = (error instanceof Error ? error : new Error(String(error))) as DatabaseError;
    logLine(logger, "error", "DB_ERROR", {
      req: context.requestId,
      route: context.route,
      op: operation,
      duration: `${durationMs}ms`,
      status: "error",
      code: databaseError.code,
      severity: databaseError.severity,
      timeout: databaseError.code === "57014" || /statement timeout|lock timeout/i.test(databaseError.message),
      message: sanitizeDatabaseMessage(databaseError.message),
      concurrent_at_start: activeBefore,
      at: new Date().toISOString(),
    });
    throw error;
  } finally {
    if (slowTimer) clearTimeout(slowTimer);
    instanceState.activeOperations = Math.max(0, instanceState.activeOperations - 1);
  }
}

export async function observeRequest<T>(
  route: string,
  callback: () => Promise<T>,
  options: { requestId?: string; logger?: Logger; now?: () => number } = {},
): Promise<T> {
  const logger = options.logger ?? console;
  const now = options.now ?? Date.now;
  const requestId = options.requestId || createRequestId();
  const startedAt = now();

  return requestContext.run({ requestId, route }, async () => {
    try {
      const result = await callback();
      const durationMs = Math.max(0, now() - startedAt);
      const responseStatus = result instanceof Response ? result.status : 200;
      const failed = responseStatus >= 400;
      if (observabilityEnabled() || failed || durationMs > 1_000) {
        logLine(logger, failed ? "error" : durationMs > 1_000 ? "warn" : "info", failed ? "REQUEST_ERROR" : "REQUEST", {
          req: requestId,
          route,
          duration: `${durationMs}ms`,
          status: failed ? responseStatus : "ok",
          at: new Date().toISOString(),
        });
      }
      return result;
    } catch (error) {
      const durationMs = Math.max(0, now() - startedAt);
      logLine(logger, "error", "REQUEST_ERROR", {
        req: requestId,
        route,
        duration: `${durationMs}ms`,
        status: "error",
        message: sanitizeDatabaseMessage(error instanceof Error ? error.message : String(error)),
        at: new Date().toISOString(),
      });
      throw error;
    }
  });
}
