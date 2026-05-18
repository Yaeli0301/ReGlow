export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

const MAX_BUFFER = 300;
const buffer: LogEntry[] = [];
let seq = 0;

function push(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    id: `${Date.now()}-${++seq}`,
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) buffer.shift();

  const line = context ? `${message} ${JSON.stringify(context)}` : message;
  if (level === "error") console.error(`[ReGlow:${level}]`, line);
  else if (level === "warn") console.warn(`[ReGlow:${level}]`, line);
  else console.log(`[ReGlow:${level}]`, line);

  return entry;
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => push("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => push("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => push("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => push("error", message, context),
  getRecent: (limit = 100): LogEntry[] => buffer.slice(-limit).reverse(),
  clear: () => {
    buffer.length = 0;
  },
};
