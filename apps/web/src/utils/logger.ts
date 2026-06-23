// utils/logger.ts
// Conditional logger that only outputs in development mode

type LogLevel = "debug" | "info" | "warn" | "error";

interface ChildLogger {
  debug: (...args: unknown[]) => void;
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  group: (groupLabel: string) => void;
  groupEnd: () => void;
  table: (data: unknown) => void;
}

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const config: LoggerConfig = {
  enabled: import.meta.env.DEV,
  level: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || "info",
};

const shouldLog = (level: LogLevel): boolean => {
  if (!config.enabled) return false;
  return LOG_LEVELS[level] >= LOG_LEVELS[config.level];
};

const formatMessage = (prefix: string, ...args: unknown[]): unknown[] => {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
  return [`[${timestamp}] ${prefix}`, ...args];
};

export const logger = {
  debug: (...args: unknown[]): void => {
    if (shouldLog("debug")) {
      console.log(...formatMessage("[DEBUG]", ...args));
    }
  },

  log: (...args: unknown[]): void => {
    if (shouldLog("info")) {
      console.log(...formatMessage("[INFO]", ...args));
    }
  },

  info: (...args: unknown[]): void => {
    if (shouldLog("info")) {
      console.info(...formatMessage("[INFO]", ...args));
    }
  },

  warn: (...args: unknown[]): void => {
    if (shouldLog("warn")) {
      console.warn(...formatMessage("[WARN]", ...args));
    }
  },

  error: (...args: unknown[]): void => {
    if (shouldLog("error")) {
      console.error(...formatMessage("[ERROR]", ...args));
    }
  },

  // Group logging for related messages
  group: (label: string): void => {
    if (config.enabled) {
      console.group(label);
    }
  },

  groupEnd: (): void => {
    if (config.enabled) {
      console.groupEnd();
    }
  },

  // Table for structured data
  table: (data: unknown): void => {
    if (config.enabled) {
      console.table(data);
    }
  },

  // Create a labelled child logger that prefixes every message with [label].
  createChild: (label: string): ChildLogger => ({
    debug: (...args: unknown[]): void => logger.debug(`[${label}]`, ...args),
    log: (...args: unknown[]): void => logger.log(`[${label}]`, ...args),
    info: (...args: unknown[]): void => logger.info(`[${label}]`, ...args),
    warn: (...args: unknown[]): void => logger.warn(`[${label}]`, ...args),
    error: (...args: unknown[]): void => logger.error(`[${label}]`, ...args),
    group: (groupLabel: string): void =>
      logger.group(`[${label}] ${groupLabel}`),
    groupEnd: (): void => logger.groupEnd(),
    table: (data: unknown): void => logger.table(data),
  }),
};

export default logger;
