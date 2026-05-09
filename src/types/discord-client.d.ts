import type { CommandDefinition } from '../handlers/command-handler.js';

declare module 'discord.js' {
  interface Client {
    commands: Map<string, CommandDefinition>;
  }
}
