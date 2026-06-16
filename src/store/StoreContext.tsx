import React, {
  createContext, useCallback, useContext, useEffect, useReducer,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppData, Expense, Group, Member, Settlement } from "../lib/types";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useAuth } from "../auth/AuthContext";

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
type Action =
  | { type: "LOAD";          data:       AppData }
  | { type: "ADD_EXPENSE";   expense:    Expense }
  | { type: "DELETE_EXPENSE";id:         string }
  | { type: "ADD_GROUP";     group:      Group;  newMembers: Member[] }
  | { type: "DELETE_GROUP";  id:         string }
  | { type: "ADD_SETTLEMENT";settlement: Settlement };

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case "LOAD":           return action.data;
    case "ADD_EXPENSE":    return { ...state, expenses: [action.expense, ...state.expenses] };
    case "DELETE_EXPENSE": return { ...state, expenses: state.expenses.filter(e => e.id !== action.id) };
    case "ADD_GROUP":      return {
      ...state,
      groups:  [action.group, ...state.groups],
      members: [...state.members, ...action.newMembers.filter(nm => !state.members.find(m => m.id === nm.id))],
    };
    case "DELETE_GROUP":   return {
      ...state,
      groups:      state.groups.filter(g => g.id !== action.id),
      expenses:    state.expenses.filter(e => e.groupId !== action.id),
      settlements: state.settlements.filter(s => s.groupId !== action.id),
    };
    case "ADD_SETTLEMENT": return { ...state, settlements: [action.settlement, ...state.settlements] };
    default:               return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface StoreCtx {
  data:       AppData;
  loading:    boolean;
  meId:       string;                    // current user's ID in the data model
  dispatch:   (action: Action) => void;
  memberById: Map<string, Member>;
  groupById:  Map<string, Group>;
}

const Ctx = createContext<StoreCtx | null>(null);
const EMPTY: AppData = { members: [], groups: [], expenses: [], settlements: [] };

// ---------------------------------------------------------------------------
// Local storage (offline / no-Supabase mode)
// ---------------------------------------------------------------------------
const localKey = (uid: string) => `batwara:data:v2:${uid}`;

async function loadLocal(uid: string): Promise<AppData | null> {
  const raw = await AsyncStorage.getItem(localKey(uid));
  return raw ? JSON.parse(raw) : null;
}

async function saveLocal(uid: string, data: AppData) {
  await AsyncStorage.setItem(localKey(uid), JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Supabase loaders
// ---------------------------------------------------------------------------
async function loadFromSupabase(userId: string): Promise<AppData | null> {
  if (!supabase) return null;
  try {
    // 1. Groups the user is a member of
    const { data: myMemberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId);

    const groupIds = (myMemberships ?? []).map((m: any) => m.group_id);

    // 2. Group details + all their members + profiles in parallel
    const [groupsRes, allMembershipsRes, myProfileRes] = await Promise.all([
      groupIds.length > 0
        ? supabase.from("groups").select("*").in("id", groupIds)
        : Promise.resolve({ data: [] }),
      groupIds.length > 0
        ? supabase.from("group_members").select("group_id, user_id").in("group_id", groupIds)
        : Promise.resolve({ data: [] }),
      supabase.from("profiles").select("id, display_name, color").eq("id", userId).single(),
    ]);

    const allMemberships: { group_id: string; user_id: string }[] = allMembershipsRes.data ?? [];
    const allUserIds = [...new Set(allMemberships.map(m => m.user_id))];

    const { data: profileRows } = allUserIds.length > 0
      ? await supabase.from("profiles").select("id, display_name, color").in("id", allUserIds)
      : { data: [] };

    // Build member map from profiles
    const memberMap = new Map<string, Member>();
    (profileRows ?? []).forEach((p: any) => {
      memberMap.set(p.id, { id: p.id, name: p.display_name, color: p.color ?? "#34d399" });
    });
    // Always include self
    if (!memberMap.has(userId) && myProfileRes.data) {
      const p = myProfileRes.data as any;
      memberMap.set(userId, { id: userId, name: p.display_name, color: p.color ?? "#34d399" });
    }

    // Build groups with memberIds arrays
    const groupMemberIds: Record<string, string[]> = {};
    allMemberships.forEach(({ group_id, user_id }) => {
      if (!groupMemberIds[group_id]) groupMemberIds[group_id] = [];
      if (!groupMemberIds[group_id].includes(user_id)) groupMemberIds[group_id].push(user_id);
    });

    const groups: Group[] = (groupsRes.data ?? []).map((g: any) => ({
      id: g.id,
      name: g.name,
      emoji: g.emoji,
      memberIds: groupMemberIds[g.id] ?? [],
      createdAt: g.created_at,
    }));

    // 3. Personal expenses
    const { data: personalRows } = await supabase
      .from("expenses")
      .select("*")
      .eq("created_by", userId)
      .eq("type", "personal")
      .order("date", { ascending: false });

    // 4. Group expenses
    const { data: groupRows } = groupIds.length > 0
      ? await supabase.from("expenses").select("*").in("group_id", groupIds).eq("type", "group").order("date", { ascending: false })
      : { data: [] };

    const expenses: Expense[] = [
      ...(personalRows ?? []).map(dbToExpense),
      ...(groupRows ?? []).map(dbToExpense),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 5. Settlements
    const { data: settlementRows } = groupIds.length > 0
      ? await supabase.from("settlements").select("*").in("group_id", groupIds)
      : { data: [] };

    return {
      members:     Array.from(memberMap.values()),
      groups,
      expenses,
      settlements: (settlementRows ?? []).map(dbToSettlement),
    };
  } catch (e) {
    console.error("[store] loadFromSupabase:", e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// DB row → app type mappers
// ---------------------------------------------------------------------------
function dbToExpense(row: any): Expense {
  return {
    id: row.id, description: row.description, amount: Number(row.amount),
    category: row.category, date: row.date, type: row.type,
    groupId: row.group_id ?? undefined, paidBy: row.paid_by ?? undefined,
    splitMethod: row.split_method ?? undefined, splits: row.splits ?? undefined,
  };
}
function dbToSettlement(row: any): Settlement {
  return {
    id: row.id, from: row.from_user, to: row.to_user,
    amount: Number(row.amount), date: row.date, groupId: row.group_id ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [data, dispatch] = useReducer(reducer, EMPTY);
  const [loading, setLoading] = React.useState(true);

  // meId: which member ID represents "me" in this session
  const meId = user?.id ?? "me";

  useEffect(() => {
    if (!user) { dispatch({ type: "LOAD", data: EMPTY }); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);

    (async () => {
      let loaded: AppData | null = null;

      if (isSupabaseConfigured) {
        loaded = await loadFromSupabase(user.id);
      } else {
        loaded = await loadLocal(user.id);
      }

      // First login: start empty, just add self as a member
      if (!loaded || loaded.members.length === 0) {
        const me: Member = { id: user.id, name: user.displayName, color: "#34d399" };
        loaded = { members: [me], groups: [], expenses: [], settlements: [] };
        if (!isSupabaseConfigured) await saveLocal(user.id, loaded);
      }

      if (!cancelled) { dispatch({ type: "LOAD", data: loaded }); setLoading(false); }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  // ---------------------------------------------------------------------------
  // Wrapped dispatch — optimistic update + async Supabase/local persist
  // ---------------------------------------------------------------------------
  const wrappedDispatch = useCallback((action: Action) => {
    dispatch(action);
    if (!user) return;

    // Fire-and-forget persistence
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        // Local: re-read, apply, write back
        const raw = await AsyncStorage.getItem(localKey(user.id));
        const current: AppData = raw ? JSON.parse(raw) : EMPTY;
        await saveLocal(user.id, reducer(current, action));
        return;
      }

      // Supabase
      switch (action.type) {
        case "ADD_EXPENSE":
          await supabase.from("expenses").insert({
            id:           action.expense.id,
            created_by:   user.id,
            description:  action.expense.description,
            amount:       action.expense.amount,
            category:     action.expense.category,
            date:         action.expense.date,
            type:         action.expense.type,
            group_id:     action.expense.groupId  ?? null,
            paid_by:      action.expense.paidBy   ?? null,
            split_method: action.expense.splitMethod ?? null,
            splits:       action.expense.splits   ?? null,
          });
          break;

        case "DELETE_EXPENSE":
          await supabase.from("expenses").delete().eq("id", action.id);
          break;

        case "ADD_GROUP": {
          // Insert group then all members into junction table
          await supabase.from("groups").insert({
            id:         action.group.id,
            created_by: user.id,
            name:       action.group.name,
            emoji:      action.group.emoji,
            created_at: action.group.createdAt,
          });
          await supabase.from("group_members").insert(
            action.group.memberIds.map(uid => ({ group_id: action.group.id, user_id: uid }))
          );
          break;
        }

        case "DELETE_GROUP":
          await supabase.from("settlements").delete().eq("group_id", action.id);
          await supabase.from("expenses").delete().eq("group_id", action.id);
          await supabase.from("group_members").delete().eq("group_id", action.id);
          await supabase.from("groups").delete().eq("id", action.id);
          break;

        case "ADD_SETTLEMENT":
          await supabase.from("settlements").insert({
            id:        action.settlement.id,
            group_id:  action.settlement.groupId ?? null,
            from_user: action.settlement.from,
            to_user:   action.settlement.to,
            amount:    action.settlement.amount,
            date:      action.settlement.date,
          });
          break;
      }
    })();
  }, [user]);

  const memberById = React.useMemo(
    () => new Map(data.members.map(m => [m.id, m])), [data.members],
  );
  const groupById = React.useMemo(
    () => new Map(data.groups.map(g => [g.id, g])), [data.groups],
  );

  return (
    <Ctx.Provider value={{ data, loading, meId, dispatch: wrappedDispatch, memberById, groupById }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}
