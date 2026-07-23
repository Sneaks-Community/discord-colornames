import { z } from 'zod';
import type { BotConfig, ColorRoleEntry } from './types.js';
import { logger } from '../logger.js';

/**
 * Zod schema for validating and parsing environment variables.
 */
const configSchema = z.object({
  ACCESS_DENIED_DESCRIPTION: z
    .string()
    .default('Sorry, this command is for VIPs and Nitro Boosters only.'),
  ALLOWED_ROLES: z.string().default(''),
  COLOR_LIST_TITLE: z.string().min(1).max(256).default('Color Roles'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  EMBED_COLOR: z.coerce.number().int().min(0).max(16_777_215).default(299_410),
  HEALTH_PORT: z.coerce.number().int().positive().default(3000),
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
 * Parse color roles from environment variables.
 * Entries keep the order in which the COLOR_ROLE_<NAME> variables appear in the
 * environment (i.e. their declaration order in .env), which determines the
 * numbering shown to users.
 */
function parseColorRoles(): ColorRoleEntry[] {
  const colorRoleEntries = Object.entries(process.env)
    .filter(([key]) => key.startsWith('COLOR_ROLE_'))
    .filter(([, value]) => value);

  return colorRoleEntries.map(([key, value]) => ({
    name: key.replace('COLOR_ROLE_', '').toLowerCase(),
    roleId: value!,
  }));
}

/**
 * Load environment variables, validate them, and build the bot configuration.
 */
function loadConfig(): BotConfig {
  // Environment variables are loaded via ../environment.js (imported
  // transitively by ../logger.js) before this module executes.

  // Parse and validate environment variables
  const parsed = configSchema.parse({
    ACCESS_DENIED_DESCRIPTION: process.env.ACCESS_DENIED_DESCRIPTION,
    ALLOWED_ROLES: process.env.ALLOWED_ROLES,
    COLOR_LIST_TITLE: process.env.COLOR_LIST_TITLE,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    EMBED_COLOR: process.env.EMBED_COLOR,
    HEALTH_PORT: process.env.HEALTH_PORT,
    PIN_CHANNEL_ID: process.env.PIN_CHANNEL_ID,
    SERVER_ID: process.env.SERVER_ID,
  });

  // Validate bot token format
  validateBotToken(parsed.DISCORD_TOKEN);

  const colorRoles = parseColorRoles();

  const allowedRolesRaw = parsed.ALLOWED_ROLES.split(',')
    .map((r) => r.trim())
    .filter(Boolean);

  const botConfig: BotConfig = {
    accessDeniedDescription: parsed.ACCESS_DENIED_DESCRIPTION,
    allowedRoles: allowedRolesRaw,
    clientId: parsed.DISCORD_CLIENT_ID,
    colorListTitle: parsed.COLOR_LIST_TITLE,
    colorRoles,
    embedColor: parsed.EMBED_COLOR,
    healthPort: parsed.HEALTH_PORT,
    pinChannelId: parsed.PIN_CHANNEL_ID,
    serverId: parsed.SERVER_ID,
    token: parsed.DISCORD_TOKEN,
  };

  logger.info(
    { clientId: botConfig.clientId, serverId: botConfig.serverId },
    'Configuration parsed successfully',
  );

  return botConfig;
}

export const config: BotConfig = loadConfig();
