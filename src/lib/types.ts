export const CATEGORIES = [
  "Grocery",
  "Rent",
  "Entertainment",
  "Dining",
  "Utilities",
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

export interface AppData {
  members: Member[];
  groups: Group[];
  expenses: Expense[];
  settlements: Settlement[];
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
