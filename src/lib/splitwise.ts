import type { Expense, Settlement, SimplifiedDebt, Split, SplitMethod } from "./types";
import { round2 } from "./utils";

export function computeBalances(
  expenses: Expense[],
  settlements: Settlement[],
  groupId?: string,
): Map<string, number> {
  const balances = new Map<string, number>();
  const add = (id: string, delta: number) =>
    balances.set(id, (balances.get(id) ?? 0) + delta);

  for (const e of expenses) {
    if (e.type !== "group" || !e.paidBy || !e.splits) continue;
    if (groupId && e.groupId !== groupId) continue;
    add(e.paidBy, e.amount);
    for (const s of e.splits) add(s.memberId, -s.amount);
  }

  for (const s of settlements) {
    if (groupId && s.groupId !== groupId) continue;
    add(s.from, s.amount);
    add(s.to, -s.amount);
  }

  for (const [id, v] of balances) balances.set(id, round2(v));
  return balances;
}

export function simplifyDebts(balances: Map<string, number>): SimplifiedDebt[] {
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  for (const [id, balance] of balances) {
    if (balance > 0.005) creditors.push({ id, amount: balance });
    else if (balance < -0.005) debtors.push({ id, amount: -balance });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const result: SimplifiedDebt[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const transfer = round2(Math.min(creditor.amount, debtor.amount));

    if (transfer > 0.005) {
      result.push({ from: debtor.id, to: creditor.id, amount: transfer });
    }

    creditor.amount = round2(creditor.amount - transfer);
    debtor.amount = round2(debtor.amount - transfer);

    if (creditor.amount <= 0.005) ci++;
    if (debtor.amount <= 0.005) di++;
  }

  return result;
}

/**
 * Direct, per-person balances between `meId` and every other member.
 * Returns a map of otherMemberId → net amount:
 *   positive  → that person owes you
 *   negative  → you owe that person
 * Unlike simplifyDebts (which globally minimises transactions and may reroute
 * debt through third parties), this reflects the actual money owed between you
 * and each individual.
 */
export function computePairwiseBalances(
  expenses: Expense[],
  settlements: Settlement[],
  meId: string,
  groupId?: string,
): Map<string, number> {
  const net = new Map<string, number>();
  const add = (id: string, delta: number) =>
    net.set(id, (net.get(id) ?? 0) + delta);

  for (const e of expenses) {
    if (e.type !== "group" || !e.paidBy || !e.splits) continue;
    if (groupId && e.groupId !== groupId) continue;
    const payer = e.paidBy;
    for (const s of e.splits) {
      if (s.memberId === payer) continue;            // payer's own share — no debt
      if (payer === meId && s.memberId !== meId) add(s.memberId, s.amount);   // they owe you
      else if (s.memberId === meId && payer !== meId) add(payer, -s.amount);  // you owe them
    }
  }

  for (const st of settlements) {
    if (groupId && st.groupId !== groupId) continue;
    if (st.from === meId) add(st.to, st.amount);       // you paid them back
    else if (st.to === meId) add(st.from, -st.amount); // they paid you back
  }

  for (const [id, v] of net) net.set(id, round2(v));
  return net;
}

export function resolveSplits(
  method: SplitMethod,
  amount: number,
  memberIds: string[],
  values?: Record<string, number>,
): Split[] {
  if (memberIds.length === 0) return [];

  if (method === "equal") {
    const paise = Math.round(amount * 100);
    const base = Math.floor(paise / memberIds.length);
    let remainder = paise - base * memberIds.length;
    return memberIds.map((memberId) => {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      return { memberId, amount: (base + extra) / 100 };
    });
  }

  if (method === "exact") {
    return memberIds.map((memberId) => ({
      memberId,
      amount: round2(values?.[memberId] ?? 0),
    }));
  }

  return memberIds.map((memberId) => ({
    memberId,
    amount: round2((amount * (values?.[memberId] ?? 0)) / 100),
  }));
}

export function validateSplits(
  method: SplitMethod,
  amount: number,
  memberIds: string[],
  values: Record<string, number>,
): string | null {
  if (memberIds.length === 0) return "Select at least one participant";
  if (method === "equal") return null;

  const total = memberIds.reduce((sum, id) => sum + (values[id] ?? 0), 0);

  if (method === "exact") {
    const diff = round2(total - amount);
    if (Math.abs(diff) > 0.01) {
      return diff > 0
        ? `Splits exceed the bill by ₹${Math.abs(diff).toFixed(2)}`
        : `₹${Math.abs(diff).toFixed(2)} left to assign`;
    }
    return null;
  }

  const diff = round2(total - 100);
  if (Math.abs(diff) > 0.01) {
    return diff > 0
      ? `Percentages exceed 100% by ${Math.abs(diff).toFixed(1)}%`
      : `${Math.abs(diff).toFixed(1)}% left to assign`;
  }
  return null;
}

export function shareOf(expense: Expense, memberId: string): number {
  if (expense.type === "personal") return memberId === "me" ? expense.amount : 0;
  return expense.splits?.find((s) => s.memberId === memberId)?.amount ?? 0;
}
