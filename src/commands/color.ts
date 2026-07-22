import type { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';
import { config } from '../config/index.js';
import { logger } from '../logger.js';
import { safeReply } from '../utils/interaction.js';
import {
  hasAllowedRole,
  getColorRoleIdByIndex,
  getColorRoleNameByIndex,
  removeAllColorRoles,
} from '../utils/role-utilities.js';
import { validateIntegerInput } from '../utils/validators.js';

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
        await safeReply(interaction, { content: 'Please provide a valid number.' });
        return;
      }

      // Check if user has allowed role
      if (!hasAllowedRole(member)) {
        logger.debug({ hasAllowedRole: false, userId: interaction.user.id }, 'Access denied');
        await safeReply(interaction, {
          content: 'You do not have permission to use this command.',
        });
        return;
      }

      // Handle color reset (0)
      if (number === 0) {
        const { failed } = await removeAllColorRoles(member);
        if (failed.length > 0) {
          logger.error(
            { failedRoles: failed.map((r) => r.name), userId: interaction.user.id },
            'Failed to remove color roles on reset',
          );
          await safeReply(interaction, {
            content: 'Failed to remove color roles. Please check my permissions.',
          });
          return;
        }
        logger.debug(
          { userId: interaction.user.id, username: interaction.user.username },
          'Color roles reset',
        );
        await safeReply(interaction, { content: 'All color roles have been removed.' });
        return;
      }

      // Validate the number
      const maxRoles = config.colorRoles.length;
      const parsedNumber = validateIntegerInput(number.toString(), maxRoles);

      if (!parsedNumber) {
        const message = `Please enter a valid number between 1 and ${maxRoles}. Use /colors to see the list.`;
        await safeReply(interaction, { content: message });
        return;
      }

      const roleId = getColorRoleIdByIndex(parsedNumber);

      if (!roleId) {
        const message = 'Invalid color number. Use /colors to see available options.';
        await safeReply(interaction, { content: message });
        return;
      }

      const roleName = getColorRoleNameByIndex(parsedNumber);

      // Check if user already has this role
      if (member.roles.cache.has(roleId)) {
        await safeReply(interaction, { content: `You already have the ${roleName} color role!` });
        return;
      }

      // Remove all existing color roles and add the new one
      try {
        const { failed } = await removeAllColorRoles(member);
        if (failed.length > 0) {
          logger.error(
            { failedRoles: failed.map((r) => r.name), userId: interaction.user.id },
            'Failed to remove existing color roles before setting new one',
          );
          await safeReply(interaction, {
            content: 'Failed to update your color roles. Please check my permissions.',
          });
          return;
        }
        const guild = interaction.guild;
        if (!guild) {
          await safeReply(interaction, { content: 'Error: Could not access guild.' });
          return;
        }
        const role = guild.roles.cache.get(roleId);
        if (!role) {
          await safeReply(interaction, { content: 'Error: Color role not found.' });
          return;
        }

        await member.roles.add(role);
        logger.debug({ roleName, userId: interaction.user.id }, 'Color role set');

        await safeReply(interaction, { content: `Successfully set your color to ${roleName}!` });
      } catch (error) {
        logger.error({ error, userId: interaction.user.id }, 'Failed to add color role');
        await safeReply(interaction, {
          content: 'Failed to add the color role. Please check my permissions.',
        });
      }
    } catch (error) {
      logger.error(
        { error, userId: interaction?.user?.id ?? 'unknown' },
        'Unexpected error in color command',
      );
      await safeReply(interaction, {
        content: 'An unexpected error occurred. Please try again later.',
      });
    }
  },
};
