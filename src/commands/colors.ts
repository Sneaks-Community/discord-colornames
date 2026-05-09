import type { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';
import { buildAccessDeniedEmbed, buildColorListEmbed } from '../utils/embed-builders.js';
import { hasAllowedRole } from '../utils/role-utilities.js';

export default {
  data: new SlashCommandBuilder()
    .setName('colors')
    .setDescription('List all available color roles'),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;

    // Check if user has allowed role
    if (!hasAllowedRole(member)) {
      const embed = buildAccessDeniedEmbed(member);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    const embed = buildColorListEmbed();
    await interaction.reply({ embeds: [embed] });
  },
};
