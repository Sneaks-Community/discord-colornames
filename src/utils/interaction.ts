import type { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { MessageFlags } from 'discord.js';
import { logger } from '../logger.js';

interface SafeReplyOptions {
  content?: string;
  embeds?: EmbedBuilder[];
  ephemeral?: boolean;
}

/**
 * Safely reply to an interaction whether or not it has already been replied to or deferred.
 * Wraps the reply in try-catch to handle edge cases like already replied or expired interactions.
 * @param interaction - The interaction to reply to
 * @param options - The reply content/embeds and whether the reply should be ephemeral (default true)
 */
export async function safeReply(
  interaction: ChatInputCommandInteraction,
  options: SafeReplyOptions,
): Promise<void> {
  try {
    const { content, embeds, ephemeral = true } = options;
    const payload = {
      content,
      embeds,
      flags: ephemeral ? (MessageFlags.Ephemeral as const) : undefined,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch (error) {
    // Expected for already-replied or expired interactions; log at debug so genuine
    // delivery failures remain observable without adding noise at the default level.
    logger.debug({ error }, 'safeReply failed to deliver interaction response');
  }
}
