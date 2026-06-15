import type { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';
import { buildAccessDeniedEmbed, buildColorListEmbed } from '../utils/embed-builders.js';
import { safeReply } from '../utils/interaction.js';
import { hasAllowedRole } from '../utils/role-utilities.js';

const builder = new SlashCommandBuilder();
const data = builder.setName('colors').setDescription('List all available color roles');

export default {
  data,
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;

    // Check if user has allowed role
    if (!hasAllowedRole(member)) {
      const embed = buildAccessDeniedEmbed(member);
      await safeReply(interaction, { embeds: [embed], ephemeral: false });
      return;
    }

    const embed = buildColorListEmbed();
    await safeReply(interaction, { embeds: [embed], ephemeral: false });
  },
};
