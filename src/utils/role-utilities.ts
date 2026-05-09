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
 * Remove all color roles from a member.
 * Batches removal into a single API call for efficiency and atomicity.
 * @param member - The Discord member
 * @returns Array of roles that were removed
 */
export async function removeAllColorRoles(member: GuildMember): Promise<Role[]> {
  const removed: Role[] = [];
  const colorRoleIds = getColorRoleIds();

  // Collect all color roles the member currently has
  const rolesToRemove = colorRoleIds
    .map((roleId) => member.guild.roles.cache.get(roleId))
    .filter((role): role is Role => role !== undefined && member.roles.cache.has(role.id));

  if (rolesToRemove.length === 0) {
    return removed;
  }

  // Remove all roles in a single API call for atomicity
  try {
    await member.roles.remove(rolesToRemove);
    return rolesToRemove;
  } catch {
    logger.error({ roleCount: rolesToRemove.length, userId: member.user.id }, 'Failed to remove color roles');
    // Fallback: remove roles one by one
    for (const role of rolesToRemove) {
      try {
        await member.roles.remove(role);
        removed.push(role);
      } catch (roleError) {
        logger.error({ error: roleError, roleId: role.id }, 'Failed to remove individual color role');
      }
    }
    return removed;
  }
}

