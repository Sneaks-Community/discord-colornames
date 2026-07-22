import type { GuildMember, Role } from 'discord.js';
import { config } from '../config/index.js';
import { logger } from '../logger.js';

/**
 * Get all color role IDs from the configuration.
 */
export function getColorRoleIds(): string[] {
  return config.colorRoles.map((entry) => entry.roleId);
}

/**
 * Get the color role ID for a given index (1-based).
 * @param index - 1-based index into the color roles list
 * @returns The role ID, or undefined if invalid
 */
export function getColorRoleIdByIndex(index: number): string | undefined {
  const roles = config.colorRoles;
  if (index < 1 || index > roles.length) {
    return undefined;
  }
  return roles[index - 1].roleId;
}

/**
 * Get the color role name for a given index (1-based).
 * @param index - 1-based index into the color roles list
 * @returns The role name, or undefined if invalid
 */
export function getColorRoleNameByIndex(index: number): string | undefined {
  const entries = config.colorRoles;
  if (index < 1 || index > entries.length) {
    return undefined;
  }
  return entries[index - 1].name;
}

/**
 * Get the total number of color roles configured.
 */
export function getColorRoleCount(): number {
  return config.colorRoles.length;
}

/**
 * Check if a member has any allowed role to use color commands.
 * @param member - The Discord member to check
 * @returns true if the member has at least one allowed role
 */
export function hasAllowedRole(member: GuildMember): boolean {
  return config.allowedRoles.some((roleId) => member.roles.cache.has(roleId));
}

/**
 * Result of a color-role removal attempt.
 * `failed` is non-empty when Discord rejected one or more removals, so callers
 * can distinguish real success from a partial/total failure.
 */
export interface RemoveColorRolesResult {
  failed: Role[];
  removed: Role[];
}

/**
 * Remove all color roles from a member.
 * Batches removal into a single API call for efficiency and atomicity, falling
 * back to per-role removal if the batch call fails.
 * @param member - The Discord member
 * @returns The roles that were removed and the roles that could not be removed
 */
export async function removeAllColorRoles(member: GuildMember): Promise<RemoveColorRolesResult> {
  const removed: Role[] = [];
  const failed: Role[] = [];
  const colorRoleIds = getColorRoleIds();

  // Collect all color roles the member currently has
  const rolesToRemove = colorRoleIds
    .map((roleId) => member.guild.roles.cache.get(roleId))
    .filter((role): role is Role => role !== undefined && member.roles.cache.has(role.id));

  if (rolesToRemove.length === 0) {
    return { failed, removed };
  }

  // Remove all roles in a single API call for atomicity
  try {
    await member.roles.remove(rolesToRemove);
    return { failed, removed: rolesToRemove };
  } catch {
    logger.error(
      { roleCount: rolesToRemove.length, userId: member.user.id },
      'Failed to remove color roles',
    );
    // Fallback: remove roles one by one so a single bad role doesn't block others
    for (const role of rolesToRemove) {
      try {
        await member.roles.remove(role);
        removed.push(role);
      } catch (roleError) {
        logger.error(
          { error: roleError, roleId: role.id },
          'Failed to remove individual color role',
        );
        failed.push(role);
      }
    }
    return { failed, removed };
  }
}
