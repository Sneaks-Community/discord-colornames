import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import colorCommand from '../commands/color.js';
import colorsCommand from '../commands/colors.js';
import { logger } from '../logger.js';

/**
 * All possible return types from SlashCommandBuilder depending on usage.
 */
type SlashCommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

/**
 * Interface for all command definitions.
 * Ensures each command has a registered data object and an execute function.
 */
export interface CommandDefinition {
  data: SlashCommandData;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const commandList: CommandDefinition[] = [colorCommand, colorsCommand];

/**
 * Load all command handlers.
 * Returns a Map of command name to command definition.
 */
export function loadCommands(): Map<string, CommandDefinition> {
  const commands = new Map<string, CommandDefinition>();

  for (const command of commandList) {
    if (command && 'data' in command && 'execute' in command) {
      const data = command.data as SlashCommandData;
      commands.set(data.name, command);
      logger.info({ commandName: data.name }, 'Command loaded');
    } else {
      logger.warn({ command }, 'Skipping command without data or execute');
    }
  }

  return commands;
}
