import type { GuildMember } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { config } from '../config/index.js';
import { getColorRoleCount, getColorRoleIdByIndex } from './role-utilities.js';

/**
 * Build the color list embed that shows all available colors.
 * @returns The constructed EmbedBuilder
 */
export function buildColorListEmbed(): EmbedBuilder {
  let list = '0: Reset Color\n';
  let index = 1;
  const count = getColorRoleCount();

  while (index <= count) {
    const roleId = getColorRoleIdByIndex(index);
    if (roleId) {
      list += `${index}: <@&${roleId}>\n`;
    }
    index++;
  }

  const builder = new EmbedBuilder();
  const embed = builder
    .setTitle('Color Roles')
    .setDescription(
      `Please select a color from the list below.\n\n${list}To set a color, use \`/color <Color Number>\``,
    )
    .setColor(config.embedColor);

  return embed;
}

/**
 * Build the access denied embed for users without allowed roles.
 * @param _member - The member who tried to use the command
 * @returns The constructed EmbedBuilder
 */
export function buildAccessDeniedEmbed(_member: GuildMember): EmbedBuilder {
  const builder = new EmbedBuilder();
  return builder
    .setTitle('Access Denied')
    .setDescription(config.accessDeniedDescription)
    .setColor(config.embedColor);
}
