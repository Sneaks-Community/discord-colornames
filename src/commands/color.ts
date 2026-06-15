import type { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { SlashCommandBuilder, MessageFlags, PermissionsBitField } from 'discord.js';
import { config } from '../config/index.js';
import { logger } from '../logger.js';
import {
  hasAllowedRole,
  getColorRoleIdByIndex,
  getColorRoleNameByIndex,
  removeAllColorRoles,
} from '../utils/role-utilities.js';
import { validateIntegerInput } from '../utils/validators.js';

/**
 * Safely reply to an interaction only if it hasn't been replied to or deferred yet.
 * Wraps the reply in try-catch to handle edge cases like already replied or expired interactions.
 */
async function safeReply(
  interaction: ChatInputCommandInteraction,
  content: string,
  ephemeral = true,
): Promise<void> {
  try {
    const options = {
      content,
      flags: ephemeral ? (MessageFlags.Ephemeral as const) : undefined,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(options);
    } else {
      await interaction.reply(options);
    }
  } catch {
    // Ignore errors from already replied or expired interactions
  }
}

const builder = new SlashCommandBuilder();
const data = builder
  .setName('color')
  .setDescription('Set your color role')
  .addIntegerOption((option) =>
    option
      .setName('number')
      .setDescription('The number of the color to select (0 to reset)')
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(config.colorRoles.length + 1),
  );

export default {
  data,
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const member = interaction.member as GuildMember;
      const number = interaction.options.getInteger('number');

      logger.debug(
        { commandName: 'color', number, userId: interaction.user.id },
        'Color command invoked',
      );

      if (number === null || number === undefined) {
        await safeReply(interaction, 'Please provide a valid number.');
        return;
      }

      // Check if user has allowed role
      if (!hasAllowedRole(member)) {
        logger.debug({ hasAllowedRole: false, userId: interaction.user.id }, 'Access denied');
        await safeReply(interaction, 'You do not have permission to use this command.');
        return;
      }

      // Handle color reset (0)
      if (number === 0) {
        try {
          await removeAllColorRoles(member);
          logger.debug(
            { userId: interaction.user.id, username: interaction.user.username },
            'Color roles reset',
          );
          await safeReply(interaction, 'All color roles have been removed.');
        } catch (error) {
          logger.error(
            { error, userId: interaction.user.id },
            'Failed to remove color roles on reset',
          );
          await safeReply(
            interaction,
            'Failed to remove color roles. Please check my permissions.',
          );
        }
        return;
      }

      // Validate the number
      const maxRoles = config.colorRoles.length;
      const parsedNumber = validateIntegerInput(number.toString(), maxRoles);

      if (!parsedNumber) {
        const message = `Please enter a valid number between 1 and ${maxRoles}. Use /colors to see the list.`;
        await safeReply(interaction, message);
        return;
      }

      const roleId = getColorRoleIdByIndex(parsedNumber);

      if (!roleId) {
        const message = 'Invalid color number. Use /colors to see available options.';
        await safeReply(interaction, message);
        return;
      }

      const roleName = getColorRoleNameByIndex(parsedNumber);

      // Check if user already has this role
      if (member.roles.cache.has(roleId)) {
        await safeReply(interaction, `You already have the ${roleName} color role!`);
        return;
      }

      // Remove all existing color roles and add the new one
      try {
        await removeAllColorRoles(member);
        const guild = interaction.guild;
        if (!guild) {
          await safeReply(interaction, 'Error: Could not access guild.');
          return;
        }
        const role = guild.roles.cache.get(roleId);
        if (!role) {
          await safeReply(interaction, 'Error: Color role not found.');
          return;
        }

        await member.roles.add(role);
        logger.debug({ roleName, userId: interaction.user.id }, 'Color role set');

        await safeReply(interaction, `Successfully set your color to ${roleName}!`);
      } catch (error) {
        logger.error({ error, userId: interaction.user.id }, 'Failed to add color role');
        await safeReply(interaction, 'Failed to add the color role. Please check my permissions.');
      }
    } catch (error) {
      logger.error(
        { error, userId: interaction?.user?.id ?? 'unknown' },
        'Unexpected error in color command',
      );
      await safeReply(interaction, 'An unexpected error occurred. Please try again later.');
    }
  },

  permissions: [PermissionsBitField.Flags.ManageRoles],
};
