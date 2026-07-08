export const CATEGORIES = [
  "Rent",
  "Grocery",
  "Dining",
  "Utilities",
  "Entertainment",
  "Others",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type ExpenseType = "personal" | "group";
export type SplitMethod = "equal" | "exact" | "percentage";

export const ME = "me";

export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  memberIds: string[];
  createdAt: string;
}

export interface Split {
  memberId: string;
  amount: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: Category;
  date: string;
  type: ExpenseType;
  groupId?: string;
  paidBy?: string;
  splitMethod?: SplitMethod;
  splits?: Split[];
}

export interface Settlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  date: string;
  groupId?: string;
}

// ---------------------------------------------------------------------------
// Lending — money you gave to a friend, tracked until it's returned.
// The friend can be an onboarded app user (counterpartyId set → they see it
// as "borrowed") or just a free-text name (not onboarded).
// ---------------------------------------------------------------------------
export interface Lending {
  id: string;
  lentBy: string;            // user id of the lender (record creator)
  counterpartyId?: string;   // app user id of the friend, if they're onboarded
  counterpartyName: string;  // display name (a member's name, or a typed-in name)
  counterpartyEmail?: string;// optional; auto-links the loan when they onboard later
  amount: number;
  description?: string;
  date: string;              // when the money was lent (ISO)
  createdAt: string;
  settledAt?: string;        // set when returned; undefined = still outstanding
}

// ---------------------------------------------------------------------------
// Work Ledger (household chore tracking)
// ---------------------------------------------------------------------------
export const WORK_CATEGORIES = [
  "Cleaning",
  "Cooking",
  "Shopping",
  "Water",
  "Laundry",
  "Bills",
  "Maintenance",
  "Misc",
] as const;

export type WorkCategory = (typeof WORK_CATEGORIES)[number];
export type EffortLevel = "Easy" | "Medium" | "Hard";
export type WorkStatus = "pending" | "verified" | "rejected";
export type VoteValue = "approve" | "reject";

export const REACTION_EMOJIS = ["👏", "❤️", "🔥", "🙌"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

// How long a submission stays open for validation before it is considered expired.
export const WORK_EXPIRY_HOURS = 168;

export interface WorkEntry {
  id: string;
  groupId: string;
  createdBy: string;      // member id of the submitter
  title: string;
  description: string;
  category: WorkCategory;
  effort: EffortLevel;
  durationMinutes: number;
  images: string[];       // attachment URIs
  date: string;           // when the work was done (ISO)
  createdAt: string;      // when it was submitted (ISO)
}

export interface WorkVote {
  id: string;
  workId: string;
  userId: string;
  vote: VoteValue;
  createdAt: string;
}

export interface WorkReaction {
  id: string;
  workId: string;
  userId: string;
  emoji: ReactionEmoji;
  createdAt: string;
}

export interface AppData {
  members: Member[];
  groups: Group[];
  expenses: Expense[];
  settlements: Settlement[];
  lendings: Lending[];
  work: WorkEntry[];
  workVotes: WorkVote[];
  workReactions: WorkReaction[];
}

export interface SimplifiedDebt {
  from: string;
  to: string;
  amount: number;
}

export const CATEGORY_META: Record<Category, { color: string; soft: string }> = {
  Grocery:       { color: "#34d399", soft: "rgba(52,211,153,0.14)" },
  Rent:          { color: "#8b5cf6", soft: "rgba(139,92,246,0.14)" },
  Entertainment: { color: "#f472b6", soft: "rgba(244,114,182,0.14)" },
  Dining:        { color: "#fbbf24", soft: "rgba(251,191,36,0.14)" },
  Utilities:     { color: "#38bdf8", soft: "rgba(56,189,248,0.14)" },
  Others:        { color: "#94a3b8", soft: "rgba(148,163,184,0.14)" },
};

export const WORK_CATEGORY_META: Record<WorkCategory, { color: string; soft: string; icon: string }> = {
  Cleaning:    { color: "#34d399", soft: "rgba(52,211,153,0.14)",  icon: "sparkles-outline" },
  Cooking:     { color: "#fbbf24", soft: "rgba(251,191,36,0.14)",  icon: "restaurant-outline" },
  Shopping:    { color: "#f472b6", soft: "rgba(244,114,182,0.14)", icon: "cart-outline" },
  Water:       { color: "#38bdf8", soft: "rgba(56,189,248,0.14)",  icon: "water-outline" },
  Laundry:     { color: "#a78bfa", soft: "rgba(167,139,250,0.14)", icon: "shirt-outline" },
  Bills:       { color: "#10b981", soft: "rgba(16,185,129,0.14)",  icon: "receipt-outline" },
  Maintenance: { color: "#fb923c", soft: "rgba(251,146,60,0.14)",  icon: "construct-outline" },
  Misc:        { color: "#94a3b8", soft: "rgba(148,163,184,0.14)", icon: "ellipsis-horizontal-circle-outline" },
};

// Effort → points awarded on verification, plus display color.
export const EFFORT_META: Record<EffortLevel, { points: number; color: string; soft: string }> = {
  Easy:   { points: 10, color: "#34d399", soft: "rgba(52,211,153,0.14)" },
  Medium: { points: 20, color: "#fbbf24", soft: "rgba(251,191,36,0.14)" },
  Hard:   { points: 30, color: "#f87171", soft: "rgba(248,113,113,0.14)" },
};

export const EFFORT_LEVELS: EffortLevel[] = ["Easy", "Medium", "Hard"];
