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
      cache: new Map(roleIds.map((id) => [id, guild.roles.cache.get(id) ?? fakeRole(id)])),
      remove: mock.fn(async () => {}),
      set: mock.fn(async () => {}),
    },
    user: { id: userId, tag: 'tester', username: 'tester' },
  };
  guild.members.cache.set(userId, member);
  return member;
}

// Looked up by name: a local .env can add more COLOR_ROLE_* entries to config.
export function ids() {
  const roleId = (name) => config.colorRoles.find((entry) => entry.name === name).roleId;
  return { allowed: config.allowedRoles[0], blue: roleId('blue'), red: roleId('red') };
}
