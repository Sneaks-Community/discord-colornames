import type { Client, TextChannel, NewsChannel } from 'discord.js';
import { Events, ActivityType } from 'discord.js';
import { config } from '../config/index.js';
import { logger } from '../logger.js';
import { buildColorListEmbed } from '../utils/embed-builders.js';

// Union type for guild channels that support send() and pin()
type SendableChannel = TextChannel | NewsChannel;

/**
 * Pin or update the color list message in the configured channel.
 * If a pinned color list message already exists, it will be updated.
 * Otherwise, a new message will be created and pinned.
 * Errors are logged but do not prevent the bot from running.
 */
async function updateOrPinColorList(client: Client<true>): Promise<void> {
  const channelId = config.pinChannelId;
  if (!channelId) {
    logger.debug('PIN_CHANNEL_ID not set, skipping auto-pin');
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);

    // Check for null/undefined first
    if (!channel) {
      logger.warn(
        { channelId },
        'PIN_CHANNEL_ID points to a channel that could not be found, skipping pin',
      );
      return;
    }

    // Check if it's text-based and not a thread
    if (!channel.isTextBased() || channel.isThread()) {
      logger.warn(
        { channelId, channelType: channel.type },
        'PIN_CHANNEL_ID points to an invalid or non-sendable channel, skipping pin',
      );
      return;
    }

    // Narrow to guild channels that support send() - exclude DM, Stage, Voice channels
    const isGuildChannel = 'guild' in channel && channel.guild !== null;
    if (!isGuildChannel) {
      logger.warn(
        { channelId, channelType: channel.type },
        'PIN_CHANNEL_ID points to a non-guild channel, skipping pin',
      );
      return;
    }

    // Safe cast after all our checks
    const sendableChannel = channel as SendableChannel;

    // Diagnostic: Check bot's permissions before attempting pin operations
    const botMember = await sendableChannel.guild.members.fetch(client.user.id);
    const botPermissions = sendableChannel.permissionsFor(botMember);
    logger.debug(
      {
        botHighestRolePosition: botMember.roles.highest.position,
        channelId,
        channelName: sendableChannel.name,
        channelType: sendableChannel.type,
        hasAdministrator: botPermissions?.has('Administrator') ?? false,
        hasManageMessagesPermission: botPermissions?.has('ManageMessages') ?? false,
        hasPinPermission: botPermissions?.has('PinMessages') ?? false,
        hasReadMessageHistoryPermission: botPermissions?.has('ReadMessageHistory') ?? false,
        hasSendMessagesPermission: botPermissions?.has('SendMessages') ?? false,
        hasViewChannelPermission: botPermissions?.has('ViewChannel') ?? false,
      },
      'Bot permissions diagnostic before pin',
    );

    // Fetch pinned messages to find existing color list pin
    let pinsResponse;
    try {
      pinsResponse = await sendableChannel.messages.fetchPins();
      logger.debug({ channelId, pinCount: pinsResponse.items.length }, 'Fetched pinned messages');
    } catch (fetchError: unknown) {
      logger.error(
        { channelId, error: fetchError },
        'Failed to fetch pinned messages - may lack ViewChannel or ReadMessageHistory permission',
      );
      throw fetchError;
    }

    // pinsResponse.items is a read-only array of MessagePin objects
    // Each MessagePin has a `message` property containing the actual Message
    const existingPin = [...pinsResponse.items].find(
      (pin) =>
        pin.message.embeds.length > 0 && pin.message.embeds[0].title === config.colorListTitle,
    );

    const embed = buildColorListEmbed();

    if (existingPin) {
      // Update existing pin in place by editing the message
      logger.info(
        { channelId, existingMessageId: existingPin.message.id },
        'Found existing color list pin, attempting to update',
      );
      await sendableChannel.messages.edit(existingPin.message.id, { embeds: [embed] });
      logger.info(
        { channelId, messageId: existingPin.message.id },
        'Updated existing pinned color list',
      );
    } else {
      // Create new message and pin it
      logger.info({ channelId }, 'No existing color list pin found, creating new message');
      const message = await sendableChannel.send({ embeds: [embed] });
      logger.info({ channelId, messageId: message.id }, 'Sent message, attempting to pin');
      await message.pin();
      logger.info({ channelId, messageId: message.id }, 'Created new pinned color list');
    }
  } catch (error) {
    logger.error({ channelId, error }, 'Failed to pin/update color list message');
    throw error;
  }
}

/**
 * Event handler for when the bot is ready.
 * Sets the bot's presence, logs the configuration, and triggers auto-pin.
 */
export default {
  async execute(client: Client<true>) {
    logger.info({ tag: client.user?.tag }, 'Bot is ready!');

    await client.user.setPresence({
      activities: [{ name: `Use /color`, type: ActivityType.Playing }],
      status: 'online',
    });

    logger.info(
      {
        allowedRoleCount: config.allowedRoles.length,
        clientId: config.clientId,
        colorRoleCount: config.colorRoles.length,
        serverId: config.serverId,
      },
      'Configuration loaded',
    );

    // Run auto-pin after bot is ready
    await updateOrPinColorList(client);
  },
  name: Events.ClientReady,
  once: true,
};
