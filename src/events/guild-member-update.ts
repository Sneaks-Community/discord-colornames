import type { GuildMember } from 'discord.js';
import { Events } from 'discord.js';
import { config } from '../config/index.js';
import { logger } from '../logger.js';
import { removeAllColorRoles } from '../utils/role-utilities.js';

// Debounce map to prevent concurrent role removal for the same user
const removalPending = new Map<string, Promise<void>>();

// Timeout in milliseconds before stale entries are cleaned up (5 minutes)
const REMOVAL_PENDING_TIMEOUT = 5 * 60 * 1000;

// Maximum number of pending entries to prevent unbounded Map growth
const MAX_REMOVAL_PENDING_ENTRIES = 1000;

// Periodic cleanup interval (every 1 minute) to remove stale entries
let cleanupTimer: NodeJS.Timeout | undefined;

/**
 * Clean up stale entries from the removalPending Map.
 * Enforces maximum size limit to prevent unbounded growth.
 */
function cleanupStaleEntries(): void {
  let cleaned = 0;

  // Enforce maximum size by removing oldest entries if exceeded
  if (removalPending.size > MAX_REMOVAL_PENDING_ENTRIES) {
    const entriesToRemove = removalPending.size - MAX_REMOVAL_PENDING_ENTRIES;
    const keysToRemove = [...removalPending.keys()].slice(0, entriesToRemove);
    for (const key of keysToRemove) {
      removalPending.delete(key);
      cleaned++;
    }
    logger.warn({ remainingSize: removalPending.size, removedCount: cleaned }, 'Enforced removalPending Map size limit');
  }

  if (cleaned > 0) {
    logger.debug({ cleaned, currentSize: removalPending.size }, 'Cleaned stale removalPending entries');
  }
}

/**
 * Start the periodic cleanup timer for the removalPending Map.
 * The timer is unref'd so it won't prevent process exit.
 */
function startCleanupTimer(): void {
  if (cleanupTimer) return; // Already running

  cleanupTimer = setInterval(() => {
    cleanupStaleEntries();
  }, 60_000); // Every 1 minute

  cleanupTimer.unref(); // Don't prevent process exit
}

// Start periodic cleanup on module load
startCleanupTimer();

/**
 * Event handler for when a member's roles are updated.
 * Automatically removes color roles if the user loses their VIP/Booster status.
 */
export default {
  execute(_oldMember: GuildMember, newMember: GuildMember) {
    const hadAllowedRole = config.allowedRoles.some((r) => _oldMember.roles.cache.has(r));
    const hasAllowedRole = config.allowedRoles.some((r) => newMember.roles.cache.has(r));

    // User had an allowed role before but doesn't have one now
    if (hadAllowedRole && !hasAllowedRole) {
      const userId = newMember.user.id;

      // Debounce: skip if already pending removal for this user
      if (removalPending.has(userId)) {
        return;
      }

      logger.debug(
        { userId, username: newMember.user.username },
        'User lost allowed role, scheduling color role removal',
      );

      const removalPromise = removeAllColorRoles(newMember)
        .then((removed) => {
          if (removed.length > 0) {
            logger.debug(
              { removedRoles: removed.map((r) => r.name), userId },
              'Color roles removed',
            );
          }
        })
        .catch((error) => {
          logger.error({ error, userId }, 'Failed to remove color roles');
        })
        .finally(() => {
          removalPending.delete(userId);
        });

      removalPending.set(userId, removalPromise);

      // Schedule cleanup for stale entries after timeout
      setTimeout(() => removalPending.delete(userId), REMOVAL_PENDING_TIMEOUT);
    }
  },
  name: Events.GuildMemberUpdate,
};
