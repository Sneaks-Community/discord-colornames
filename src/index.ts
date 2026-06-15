import { REST, Routes } from 'discord.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './config/index.js';
import { loadCommands } from './handlers/command-handler.js';
import { registerEvents } from './handlers/event-handler.js';
import { server as healthServer } from './health.js';
import { logger } from './logger.js';

// Initialize Discord client with required intents
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

// Load commands on startup and cache on client for interaction handler
const commands = loadCommands();
client.commands = commands;
logger.info({ commandCount: commands.size }, 'Commands loaded');

// Register slash commands with Discord API at startup
async function registerSlashCommands() {
  const rest = new REST({ version: '10' });
  rest.setToken(config.token);
  const commandData = commands
    .values()
    .map((cmd) => cmd.data.toJSON())
    .toArray();

  try {
    logger.info(
      { commandCount: commandData.length, serverId: config.serverId },
      'Registering application commands',
    );

    await rest.put(Routes.applicationGuildCommands(config.clientId, config.serverId), {
      body: commandData,
    });

    logger.info(
      { registeredCount: commandData.length },
      'Application commands registered successfully',
    );
  } catch (error) {
    logger.error({ error }, 'Failed to register application commands');
    throw error;
  }
}

// Register all event handlers after commands are loaded
registerEvents(client);

// Shutdown guard to prevent double-execution from simultaneous signals
let isShuttingDown = false;

// Handle graceful shutdown with timeout protection
async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info('Shutting down...');

  await Promise.race([
    performShutdown(),
    new Promise<void>((resolve) =>
      setTimeout(() => {
        logger.warn('Shutdown timed out after 10s, forcing exit');
        resolve();
      }, 10_000),
    ),
  ]);

  logger.info('Shutdown complete');
  process.exit(0);
}

async function performShutdown() {
  // Close health server first, waiting for it to finish
  if (healthServer) {
    await new Promise<void>((resolve) => {
      healthServer.close(() => resolve());
    });
  }

  // Then destroy the Discord client
  await client.destroy();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (reason: unknown) => {
  const errorInfo =
    typeof reason === 'object' && reason !== null && 'toString' in reason
      ? (reason as Error).toString()
      : String(reason);
  logger.error({ error: errorInfo, reason: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error: unknown) => {
  logger.error({ error }, 'Uncaught exception');
  shutdown();
  // Re-throw to let Node exit with non-zero
  throw error;
});

// Login to Discord
async function start() {
  try {
    // Register slash commands before logging in
    await registerSlashCommands();
    await client.login(config.token);
    logger.info('Bot logged in successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to start bot');
    shutdown();
  }
}

void (async () => {
  try {
    await start();
  } catch (error) {
    logger.error({ error }, 'Failed to start bot');
    process.exit(1);
  }
})();
