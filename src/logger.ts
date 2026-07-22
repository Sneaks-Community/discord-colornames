// Ensure .env is loaded before reading process.env below.
import './environment.js';
import pino from 'pino';

/**
 * Valid Pino log levels.
 */
export const VALID_LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;
export type LogLevel = (typeof VALID_LOG_LEVELS)[number];

const rawLevel = (process.env.LOG_LEVEL || 'info') as LogLevel;

// Validate log level against known Pino levels
if (!(VALID_LOG_LEVELS as readonly string[]).includes(rawLevel)) {
  console.warn(`[WARN] Invalid LOG_LEVEL "${rawLevel}", defaulting to "info"`);
}

const logLevel: LogLevel = (VALID_LOG_LEVELS as readonly string[]).includes(rawLevel)
  ? rawLevel
  : 'info';

function serializeError(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      code: (value as unknown as Record<string, unknown>).code,
      message: value.message,
      name: value.name,
      stack: value.stack,
    };
  }
  if (typeof value === 'object' && value !== null && 'code' in value && 'message' in value) {
    const object = value as Record<string, unknown>;
    return {
      code: object.code,
      message: object.message,
      ...object,
    };
  }
  return value;
}

export const logger = pino({
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
    log: (object) => {
      for (const [key, value] of Object.entries(object)) {
        object[key] = serializeError(value);
      }
      return object;
    },
  },
  level: logLevel,
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      options: {
        colorize: true,
        translateTime: 'ISO8601',
      },
      target: 'pino-pretty',
    },
  }),
});
