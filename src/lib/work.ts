// ---------------------------------------------------------------------------
// Work Ledger logic — validation rules, stats, leaderboard.
//
// Status is DERIVED from votes + group size (never stored), so the client is
// always the single source of truth and local/Supabase modes can never drift.
// ---------------------------------------------------------------------------
import {
  EFFORT_META,
  WORK_EXPIRY_HOURS,
  type Group,
  type ReactionEmoji,
  type WorkEntry,
  type WorkReaction,
  type WorkStatus,
  type WorkVote,
} from "./types";

export interface WorkTally {
  status: WorkStatus;
  eligible: number;       // number of members who may vote (everyone but the creator)
  approvals: number;
  rejections: number;
  approvalsNeeded: number;
}

/** Members eligible to validate a submission = all group members except the creator. */
export function eligibleVoterIds(group: Group | undefined, createdBy: string): string[] {
  if (!group) return [];
  return group.memberIds.filter((id) => id !== createdBy);
}

/**
 * Resolve a submission's status from its votes and the group it belongs to.
 *
 *  - Verified: approvals ≥ ceil(eligible / 2)
 *  - Rejected: enough rejections that the approval threshold can no longer be met
 *  - Pending:  otherwise
 */
export function tallyWork(
  entry: WorkEntry,
  votes: WorkVote[],
  group: Group | undefined,
): WorkTally {
  const eligible = eligibleVoterIds(group, entry.createdBy).length;
  const forEntry = votes.filter((v) => v.workId === entry.id);
  const approvals  = forEntry.filter((v) => v.vote === "approve").length;
  const rejections = forEntry.filter((v) => v.vote === "reject").length;

  // No one else can validate (e.g. a solo group) → stays pending.
  if (eligible === 0) {
    return { status: "pending", eligible, approvals, rejections, approvalsNeeded: 0 };
  }

  const approvalsNeeded = Math.ceil(eligible / 2);

  let status: WorkStatus = "pending";
  if (approvals >= approvalsNeeded) {
    status = "verified";
  } else if (eligible - rejections < approvalsNeeded) {
    // Impossible to still reach the approval threshold.
    status = "rejected";
  }

  return { status, eligible, approvals, rejections, approvalsNeeded };
}

/** A submission has expired once the validation window has elapsed. */
export function isExpired(entry: WorkEntry, now: number = Date.now()): boolean {
  return now - new Date(entry.createdAt).getTime() > WORK_EXPIRY_HOURS * 3600_000;
}

/** Milliseconds left before a submission expires (0 once past). */
export function msUntilExpiry(entry: WorkEntry, now: number = Date.now()): number {
  const deadline = new Date(entry.createdAt).getTime() + WORK_EXPIRY_HOURS * 3600_000;
  return Math.max(0, deadline - now);
}

export function effortPoints(entry: WorkEntry): number {
  return EFFORT_META[entry.effort].points;
}

// ---------------------------------------------------------------------------
// Per-user contribution stats
// ---------------------------------------------------------------------------
export interface UserStats {
  memberId: string;
  verified: number;
  pending: number;
  rejected: number;
  minutes: number;   // verified only
  points: number;    // verified only
}

const EMPTY_STATS = (memberId: string): UserStats => ({
  memberId, verified: 0, pending: 0, rejected: 0, minutes: 0, points: 0,
});

/**
 * Aggregate stats per creator across the given entries.
 * `sinceMs` optionally limits to entries whose `date` is on/after that instant.
 */
export function computeUserStats(
  entries: WorkEntry[],
  votes: WorkVote[],
  group: Group | undefined,
  sinceMs?: number,
): Map<string, UserStats> {
  const map = new Map<string, UserStats>();
  // Seed every group member so the leaderboard shows everyone (even at zero).
  group?.memberIds.forEach((id) => map.set(id, EMPTY_STATS(id)));

  for (const entry of entries) {
    if (sinceMs != null && new Date(entry.date).getTime() < sinceMs) continue;
    const stats = map.get(entry.createdBy) ?? EMPTY_STATS(entry.createdBy);
    const { status } = tallyWork(entry, votes, group);
    if (status === "verified") {
      stats.verified += 1;
      stats.minutes  += entry.durationMinutes;
      stats.points   += effortPoints(entry);
    } else if (status === "rejected") {
      stats.rejected += 1;
    } else {
      stats.pending += 1;
    }
    map.set(entry.createdBy, stats);
  }
  return map;
}

export function rankByContribution(stats: UserStats[]): UserStats[] {
  return [...stats].sort((a, b) =>
    b.points - a.points || b.verified - a.verified || b.minutes - a.minutes,
  );
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------
export function reactionCounts(
  workId: string,
  reactions: WorkReaction[],
): Record<ReactionEmoji, number> {
  const counts = {} as Record<ReactionEmoji, number>;
  for (const r of reactions) {
    if (r.workId !== workId) continue;
    counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Time-range helpers for the leaderboard tabs
// ---------------------------------------------------------------------------
export type LeaderboardRange = "week" | "month" | "all";

export function rangeStartMs(range: LeaderboardRange, now: number = Date.now()): number | undefined {
  if (range === "all") return undefined;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (range === "week") d.setDate(d.getDate() - 6);        // rolling 7-day window
  else                  d.setDate(d.getDate() - 29);       // rolling 30-day window
  return d.getTime();
}
