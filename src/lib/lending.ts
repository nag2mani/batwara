import type { Lending, Member } from "./types";

export interface LendingPerspective {
  iAmCreator: boolean;      // did the current user log this record?
  otherId?: string;         // the other person's user id, if onboarded
  otherName: string;        // display name of the other person
  otherColor?: string;      // avatar color, if the other person is a known member
  theyOweMe: boolean;       // true → the other person owes me; false → I owe them
}

/**
 * Resolve a loan from the current user's point of view — who the other party is
 * and which way the money is owed. Works whether I logged it (as lent or
 * borrowed) or the other (onboarded) person did.
 */
export function lendingPerspective(
  l: Lending,
  meId: string,
  memberById: Map<string, Member>,
): LendingPerspective {
  const iAmCreator = l.createdBy === meId;

  if (iAmCreator) {
    const m = l.counterpartyId ? memberById.get(l.counterpartyId) : undefined;
    return {
      iAmCreator,
      otherId: l.counterpartyId,
      otherName: m?.name ?? l.counterpartyName,
      otherColor: m?.color,
      // I logged it: if I lent, they owe me; if I borrowed, I owe them.
      theyOweMe: l.direction === "lent",
    };
  }

  // I'm the (onboarded) counterparty — the mirror side.
  const creator = memberById.get(l.createdBy);
  return {
    iAmCreator,
    otherId: l.createdBy,
    otherName: creator?.name ?? "Someone",
    otherColor: creator?.color,
    // They logged it: if they lent, I owe them; if they borrowed, they owe me.
    theyOweMe: l.direction === "borrowed",
  };
}

/** Does this loan involve the current user at all? */
export function lendingInvolvesMe(l: Lending, meId: string): boolean {
  return l.createdBy === meId || l.counterpartyId === meId;
}
