import type { Category, Expense, Group, Member, Split } from "./types";
import { uid, round2, todayISO } from "./utils";

// ─── Category mapping ────────────────────────────────────────────────────────
const SW_CATEGORY_MAP: Record<string, Category> = {
  "groceries":          "Grocery",
  "grocery":            "Grocery",
  "dining out":         "Dining",
  "restaurant":         "Dining",
  "food and drink":     "Dining",
  "rent":               "Rent",
  "mortgage":           "Rent",
  "tv/phone/internet":  "Utilities",
  "utilities":          "Utilities",
  "electricity":        "Utilities",
  "water":              "Utilities",
  "entertainment":      "Entertainment",
  "movies":             "Entertainment",
  "games":              "Entertainment",
};

export function mapSplitwiseCategory(raw: string): Category {
  const key = raw.trim().toLowerCase();
  return SW_CATEGORY_MAP[key] ?? "Others";
}

// ─── CSV parser ──────────────────────────────────────────────────────────────
function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') { quoted = !quoted; }
    else if (ch === "," && !quoted) { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export interface MemberCol {
  index: number;
  identifier: string; // email or display name from CSV header
  isEmail: boolean;
}

export interface ExpenseRow {
  date: string;
  description: string;
  category: Category;
  amount: number;
  shares: number[]; // one per member col; positive = creditor, negative = debtor
}

export interface ParsedImport {
  memberCols: MemberCol[];
  rows: ExpenseRow[];
  currency: string;
}

// Fixed Splitwise columns that precede the per-member balance columns.
// "Currency" is optional — some exports omit it — so we locate every column
// by its header name instead of assuming a fixed layout.
const FIXED_HEADERS = ["date", "description", "category", "cost", "currency"];

export function parseSplitwiseCSV(csvText: string): ParsedImport | null {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const header = splitCSVLine(lines[0]);
  const lower  = header.map(h => h.trim().toLowerCase());

  const dateIdx     = lower.indexOf("date");
  const descIdx     = lower.indexOf("description");
  const catIdx      = lower.indexOf("category");
  const costIdx     = lower.indexOf("cost");
  const currencyIdx = lower.indexOf("currency");

  // Date, Description and Cost are mandatory to make sense of a row.
  if (dateIdx === -1 || descIdx === -1 || costIdx === -1) return null;

  // Member columns = every header cell that is not a known fixed column
  // and is not blank. `index` is the real column index in each CSV row.
  const memberCols: MemberCol[] = [];
  header.forEach((raw, i) => {
    if (FIXED_HEADERS.includes(lower[i])) return;
    if (!raw.trim()) return;
    memberCols.push({ index: i, identifier: raw.trim(), isEmail: raw.includes("@") });
  });

  if (memberCols.length === 0) return null;

  let currency = "INR";
  const rows: ExpenseRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i]);
    const desc = cells[descIdx]?.trim() ?? "";
    if (!desc || desc.toLowerCase() === "total balance") continue;
    if (!cells[dateIdx]?.trim()) continue;

    const amount = parseFloat(cells[costIdx] ?? "");
    if (isNaN(amount) || amount <= 0) continue;

    if (currencyIdx >= 0) currency = cells[currencyIdx]?.trim() || currency;

    const shares = memberCols.map(mc => parseFloat(cells[mc.index] ?? "0") || 0);

    rows.push({
      date: cells[dateIdx].trim(),
      description: desc,
      category: mapSplitwiseCategory(catIdx >= 0 ? (cells[catIdx] ?? "") : ""),
      amount,
      shares,
    });
  }

  return { memberCols, rows, currency };
}

// ─── Name helpers ────────────────────────────────────────────────────────────
export function nameFromIdentifier(identifier: string): string {
  if (identifier.includes("@")) {
    return identifier
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
      .trim();
  }
  return identifier.trim();
}

// ─── Build importable data ───────────────────────────────────────────────────
export interface ImportData {
  group: Group;
  newMembers: Member[];
  expenses: Expense[];
}

export function buildImportData(
  parsed: ParsedImport,
  resolvedMembers: Member[],
  existingMemberIds: Set<string>,
  groupName: string,
  groupEmoji: string,
): ImportData {
  const group: Group = {
    id: uid("g"),
    name: groupName,
    emoji: groupEmoji,
    memberIds: resolvedMembers.map(m => m.id),
    createdAt: todayISO(),
  };

  const newMembers = resolvedMembers.filter(m => !existingMemberIds.has(m.id));
  const expenses: Expense[] = [];

  for (const row of parsed.rows) {
    // Each member column holds that member's NET for the row:
    //   net = (what they paid) − (their share of the cost)
    // The payer is the column with the largest positive net (they fronted the
    // whole cost on the group's behalf). Everyone with a negative net owes; a
    // value of exactly 0 means that person was not part of this split.
    let payerIdx = -1;
    let maxShare = -Infinity;
    for (let i = 0; i < row.shares.length; i++) {
      if (row.shares[i] > maxShare) { maxShare = row.shares[i]; payerIdx = i; }
    }
    if (payerIdx === -1 || maxShare <= 0.005) continue;

    const paidBy = resolvedMembers[payerIdx].id;

    // Convert each net into the amount that member actually owes (their share):
    //   payer:  share = cost − net   (their own consumption)
    //   others: share = |net|        (what they owe the payer)
    // Members with a 0 net are skipped — they were not involved in this split.
    const splits: Split[] = resolvedMembers
      .map((m, i) => ({
        memberId: m.id,
        amount: i === payerIdx
          ? round2(row.amount - row.shares[i])
          : round2(Math.abs(row.shares[i])),
      }))
      .filter((sp) => sp.memberId === paidBy || sp.amount > 0.005);

    expenses.push({
      id: uid("e"),
      description: row.description,
      amount: row.amount,
      category: row.category,
      date: row.date,
      type: "group",
      groupId: group.id,
      paidBy,
      splitMethod: "exact",
      splits,
    });
  }

  return { group, newMembers, expenses };
}
