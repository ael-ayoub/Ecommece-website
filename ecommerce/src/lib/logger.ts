type LogFields = Record<string, unknown>;

const REDACTED_KEYS =
  /password|token|cookie|authorization|secret|database.?url|address/i;

function sanitize(fields: LogFields): LogFields {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      REDACTED_KEYS.test(key) ? "[REDACTED]" : value,
    ]),
  );
}

function write(
  level: "info" | "warn" | "error",
  message: string,
  fields: LogFields = {},
) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...sanitize(fields),
  };
  if (process.env.NODE_ENV === "production") {
    console[level](JSON.stringify(record));
  } else {
    console[level](`[${level}] ${message}`, sanitize(fields));
  }
}

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) =>
    write("error", message, fields),
};
