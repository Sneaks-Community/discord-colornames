import type { Interaction } from 'discord.js';
import { Events, MessageFlags } from 'discord.js';
import { logger } from '../logger.js';

/**
 * Event handler for slash command interactions.
 * Routes interactions to the appropriate command handlers.
 */
export default {
  execute(interaction: Interaction) {
    void (async () => {
      if (!interaction.isChatInputCommand()) {
        // Log unknown interaction types for debugging and extensibility
        if (interaction.isButton() || interaction.isSelectMenu() || interaction.isModalSubmit()) {
          logger.warn(
            { customId: interaction.customId, interactionType: interaction.type },
            'Unhandled interaction type',
          );
        }
        return;
      }

      // Retrieve commands from client cache (loaded at startup)
      const commands = interaction.client.commands;
      const command = commands.get(interaction.commandName);

      if (!command) {
        logger.warn({ commandName: interaction.commandName }, 'Unknown command invoked');
        await interaction.reply({
          content: 'An error occurred while loading this command.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        const errorInfo = error instanceof Error ? error.toString() : String(error);
        logger.error(
          { commandName: interaction.commandName, error: errorInfo },
          'Command execution failed',
        );
        const errorMessage = {
          content: 'An error occurred while executing this command.',
          flags: MessageFlags.Ephemeral as const,
        };

        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
          } else {
            await interaction.reply(errorMessage);
          }
        } catch {
          // Ignore reply errors (already replied/expired)
        }
      }
    })();
  },
  name: Events.InteractionCreate,
};
