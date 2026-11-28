import type { GuildMember, PartialGuildMember } from 'discord.js';
import { Events } from 'discord.js';
import { logger } from '../logger.js';
import { canAutoRemove, hasAllowedRole, removeAllColorRoles } from '../utils/role-utilities.js';

/**
Removes color roles from any member without an allowed role.
Reads only the new roles, because oldMember is partial when the member was not cached.
*/
export default {
  async execute(_oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
    if (hasAllowedRole(newMember) || !canAutoRemove(newMember.guild)) return;

    const userId = newMember.user.id;
    const { failed, removed } = await removeAllColorRoles(newMember);
    if (removed.length > 0) {
      logger.debug({ removedRoles: removed.map((r) => r.name), userId }, 'Color roles removed');
    }
    if (failed.length > 0) {
      logger.error(
        { failedRoles: failed.map((r) => r.name), userId },
        'Failed to remove some color roles after user lost allowed role',
      );
    }
  },
  name: Events.GuildMemberUpdate,
};
