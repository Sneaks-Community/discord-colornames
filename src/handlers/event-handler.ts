import type { Client, Events as EventsEnum, ClientEvents } from 'discord.js';
import guildMemberUpdateEvent from '../events/guild-member-update.js';
import interactionCreateEvent from '../events/interaction-create.js';
import readyEvent from '../events/ready.js';
import { logger } from '../logger.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventCallback = (this: Client, ...arguments_: any[]) => any;

type EventDefinition = {
  name: EventsEnum;
  once?: boolean;
  execute: EventCallback;
};

const eventHandlers: EventDefinition[] = [
  readyEvent,
  interactionCreateEvent,
  guildMemberUpdateEvent,
];

/**
 * Register all event handlers with the Discord client.
 * Each event is registered using .on() or .once() based on its configuration.
 */
export function registerEvents(client: Client) {
  for (const eventHandler of eventHandlers) {
    // Cast to keyof ClientEvents to satisfy TypeScript's type system
    const eventName = eventHandler.name as keyof ClientEvents;
    const isOnce = 'once' in eventHandler && eventHandler.once === true;

    const boundExecute = eventHandler.execute.bind(client) as EventCallback;

    if (isOnce) {
      client.once(eventName, boundExecute);
    } else {
      client.on(eventName, boundExecute);
    }

    logger.info({ eventName: eventHandler.name, once: isOnce }, 'Event handler registered');
  }
}
