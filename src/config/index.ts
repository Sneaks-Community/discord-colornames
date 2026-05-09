// Load environment variables from .env file
import dotenv from 'dotenv';
import { z } from 'zod';
import type { BotConfig, ColorRoleEntry } from './types.js';
import { VALID_LOG_LEVELS } from '../logger.js';
import { logger } from '../logger.js';

dotenv.config();

/**
 * Zod schema for validating and parsing environment variables.
 */
const configSchema = z.object({
  ACCESS_DENIED_DESCRIPTION: z
    .string()
    .default('Sorry, this command is for VIPs and Nitro Boosters only.'),
  ALLOWED_ROLES: z.string().default(''),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  EMBED_COLOR: z.coerce.number().int().positive().default(299_410),
  HEALTH_PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(VALID_LOG_LEVELS).default('info'),
  PIN_CHANNEL_ID: z.string().optional(),
  SERVER_ID: z.string().min(1, 'SERVER_ID is required'),
});

/**
 * Validate Discord bot token format.
 * Discord bot tokens match the pattern: [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+
 */
function validateBotToken(token: string): void {
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error(
      'DISCORD_TOKEN appears to be invalid (expected Discord bot token format: xxxxx.yyyyy.zzzzz)',
    );
  }
}

/**
 * Parse color roles from environment variables with explicit ordering.
 * Variables are sorted by their key name to ensure consistent ordering.
 */
function parseColorRoles(): ColorRoleEntry[] {
  const colorRoleEntries = Object.entries(process.env)
    .filter(([key]) => key.startsWith('COLOR_ROLE_'))
    .filter(([, value]) => value)
    .toSorted(([a], [b]) => {
      const numA = Number.parseInt(a.replace('COLOR_ROLE_', ''), 10);
      const numB = Number.parseInt(b.replace('COLOR_ROLE_', ''), 10);
      return numA - numB; // Sort numerically by the number after COLOR_ROLE_
    });

  return colorRoleEntries.map(([key, value]) => ({
    name: key.replace('COLOR_ROLE_', '').toLowerCase(),
    roleId: value!,
  }));
}

// Parse and validate environment variables
const parsed = configSchema.parse({
  ACCESS_DENIED_DESCRIPTION: process.env.ACCESS_DENIED_DESCRIPTION,
  ALLOWED_ROLES: process.env.ALLOWED_ROLES,
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  EMBED_COLOR: process.env.EMBED_COLOR,
  HEALTH_PORT: process.env.HEALTH_PORT,
  LOG_LEVEL: process.env.LOG_LEVEL,
  PIN_CHANNEL_ID: process.env.PIN_CHANNEL_ID,
  SERVER_ID: process.env.SERVER_ID,
});

// Validate bot token format
validateBotToken(parsed.DISCORD_TOKEN);

const colorRoles = parseColorRoles();

const allowedRolesRaw = parsed.ALLOWED_ROLES.split(',')
  .map((r) => r.trim())
  .filter(Boolean);

export const config: BotConfig = {
  accessDeniedDescription: parsed.ACCESS_DENIED_DESCRIPTION,
  allowedRoles: allowedRolesRaw,
  clientId: parsed.DISCORD_CLIENT_ID,
  colorRoles,
  embedColor: parsed.EMBED_COLOR,
  healthPort: parsed.HEALTH_PORT,
  logLevel: parsed.LOG_LEVEL,
  pinChannelId: parsed.PIN_CHANNEL_ID,
  serverId: parsed.SERVER_ID,
  token: parsed.DISCORD_TOKEN,
  version: '4.0.0',
};

logger.info(
  { clientId: config.clientId, serverId: config.serverId },
  'Configuration parsed successfully',
);
