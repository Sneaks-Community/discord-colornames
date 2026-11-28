// Plain-object stand-ins for the discord.js members, guilds and roles the bot touches.
import { mock } from 'node:test';
import { config } from '../dist/config/index.js';

export function fakeRole(id, { editable = true, permissions = 0n } = {}) {
  return { editable, id, name: id, permissions: { bitfield: permissions } };
}

export function fakeGuild(roles) {
  return {
    id: '100000000000000002',
    members: { cache: new Map(), fetch: mock.fn(async () => {}) },
    roles: { cache: new Map(roles.map((role) => [role.id, role])) },
  };
}

export function fakeMember(guild, roleIds, userId = '500000000000000001') {
  const member = {
    guild,
    roles: {
      add: mock.fn(async () => {}),
      cache: new Map(roleIds.map((id) => [id, guild.roles.cache.get(id) ?? fakeRole(id)])),
      remove: mock.fn(async () => {}),
      set: mock.fn(async () => {}),
    },
    user: { id: userId, tag: 'tester', username: 'tester' },
  };
  guild.members.cache.set(userId, member);
  return member;
}

// Every reply method records into `replies`, so tests don't depend on reply vs deferReply/editReply.
export function fakeInteraction(member, number) {
  const replies = [];
  const record = mock.fn(async (payload) => {
    replies.push(payload);
  });
  return {
    commandName: 'color',
    deferReply: mock.fn(async () => {}),
    deferred: false,
    editReply: record,
    followUp: record,
    guild: member.guild,
    inCachedGuild: () => true,
    member,
    options: { getInteger: () => number },
    replied: false,
    replies,
    reply: record,
    user: member.user,
  };
}

export const lastReply = (interaction) => interaction.replies.at(-1);

export const colorIndex = (name) => config.colorRoles.findIndex((entry) => entry.name === name) + 1;

// Looked up by name: a local .env can add more COLOR_ROLE_* entries to config.
export function ids() {
  const roleId = (name) => config.colorRoles.find((entry) => entry.name === name).roleId;
  return { allowed: config.allowedRoles[0], blue: roleId('blue'), red: roleId('red') };
}
