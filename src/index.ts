import { REST, Routes } from 'discord.js';
import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { config } from './config/index.js';
import { loadCommands } from './handlers/command-handler.js';
import { registerEvents } from './handlers/event-handler.js';
import { server as healthServer } from './health.js';
import { logger } from './logger.js';
import { reconcileColorRoles } from './utils/role-utilities.js';

// Without the GuildMember partial, role changes on uncached members never emit GuildMemberUpdate.
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
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
    .map((command) => command.data.toJSON())
    .toArray();

  if (config.dryRun) {
    logger.info(
      { commands: commandData.map((command) => command.name), serverId: config.serverId },
      'Dry run: would register application commands',
    );
    return;
  }

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

// Log gateway/shard error status
client.on(Events.Error, (error) => {
  logger.error({ error }, 'Discord client error');
});
client.on(Events.ShardError, (error, shardId) => {
  logger.error({ error, shardId }, 'Discord shard error');
});
client.on(Events.ShardDisconnect, (event, shardId) => {
  logger.warn({ code: event.code, shardId }, 'Discord shard disconnected');
});
// Fires at startup and on every full re-identify (session lost, events dropped), so reconcile here.
client.on(Events.ShardReady, (shardId, unavailableGuilds) => {
  logger.info({ shardId, unavailableGuilds: unavailableGuilds?.size ?? 0 }, 'Discord shard ready');
  const guild = client.guilds.cache.get(config.serverId);
  if (!guild) {
    logger.warn(
      { serverId: config.serverId },
      'Bot is not in SERVER_ID, skipping color role reconcile',
    );
    return;
  }
  void reconcileColorRoles(guild).catch((error: unknown) => {
    logger.error({ error }, 'Failed to reconcile color roles');
  });
});
client.on(Events.ShardReconnecting, (shardId) => {
  logger.debug({ shardId }, 'Discord shard reconnecting');
});
client.on(Events.ShardResume, (shardId, replayedEvents) => {
  logger.debug({ ping: client.ws.ping, replayedEvents, shardId }, 'Discord shard resumed');
});
// Carries gateway close reasons (e.g. "Zombie connection", "Received ReconnectRequest").
client.on(Events.Debug, (message) => {
  logger.debug({ message }, 'Discord gateway debug');
});

// Shutdown guard to prevent double-execution from simultaneous signals
const shutdownState = { isShuttingDown: false };

// Handle graceful shutdown with timeout protection
async function shutdown(exitCode = 0) {
  if (shutdownState.isShuttingDown) return;
  shutdownState.isShuttingDown = true;

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
  process.exit(exitCode);
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

// Wrapped so Node's signal-name argument never reaches process.exit().
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

process.on('unhandledRejection', (reason: unknown) => {
  const errorInfo =
    typeof reason === 'object' && reason !== null && 'toString' in reason
      ? (reason as Error).toString()
      : String(reason);
  logger.error({ error: errorInfo, reason: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error: unknown) => {
  logger.fatal({ error }, 'Uncaught exception, exiting');
  process.exit(1);
});

// Login to Discord
async function start() {
  if (config.dryRun) logger.warn('DRY_RUN is on: changes to Discord are logged, not made');
  try {
    // Register slash commands before logging in
    await registerSlashCommands();
    await client.login(config.token);
    logger.info('Bot logged in successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to start bot');
    // Exit non-zero so orchestrators/monitoring treat startup failure as a failure
    await shutdown(1);
  }
}

void start();
