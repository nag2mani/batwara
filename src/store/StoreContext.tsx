import React, {
  createContext, useCallback, useContext, useEffect, useReducer,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  AppData, Expense, Group, Member, Settlement, WorkEntry, WorkReaction, WorkVote,
} from "../lib/types";
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
  | { type: "ADD_SETTLEMENT";settlement: Settlement }
  | { type: "ADD_WORK";      entry:      WorkEntry }
  | { type: "DELETE_WORK";   id:         string }
  | { type: "SET_VOTE";      vote:       WorkVote }                       // replaces this user's vote on this work
  | { type: "RETRACT_VOTE";  workId:     string; userId: string }
  | { type: "ADD_REACTION";  reaction:   WorkReaction }
  | { type: "REMOVE_REACTION"; workId:   string; userId: string; emoji: string };

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
      groups:        state.groups.filter(g => g.id !== action.id),
      expenses:      state.expenses.filter(e => e.groupId !== action.id),
      settlements:   state.settlements.filter(s => s.groupId !== action.id),
      work:          state.work.filter(w => w.groupId !== action.id),
      workVotes:     state.workVotes.filter(v => !state.work.find(w => w.id === v.workId && w.groupId === action.id)),
      workReactions: state.workReactions.filter(r => !state.work.find(w => w.id === r.workId && w.groupId === action.id)),
    };
    case "ADD_SETTLEMENT": return { ...state, settlements: [action.settlement, ...state.settlements] };

    case "ADD_WORK":       return { ...state, work: [action.entry, ...state.work] };
    case "DELETE_WORK":    return {
      ...state,
      work:          state.work.filter(w => w.id !== action.id),
      workVotes:     state.workVotes.filter(v => v.workId !== action.id),
      workReactions: state.workReactions.filter(r => r.workId !== action.id),
    };
    case "SET_VOTE":       return {
      ...state,
      workVotes: [
        ...state.workVotes.filter(v => !(v.workId === action.vote.workId && v.userId === action.vote.userId)),
        action.vote,
      ],
    };
    case "RETRACT_VOTE":   return {
      ...state,
      workVotes: state.workVotes.filter(v => !(v.workId === action.workId && v.userId === action.userId)),
    };
    case "ADD_REACTION":   return { ...state, workReactions: [...state.workReactions, action.reaction] };
    case "REMOVE_REACTION":return {
      ...state,
      workReactions: state.workReactions.filter(
        r => !(r.workId === action.workId && r.userId === action.userId && r.emoji === action.emoji),
      ),
    };
    default:               return state;
  }
}

/** Backfill work arrays on data loaded before the Work Ledger existed. */
function normalize(data: AppData): AppData {
  return {
    ...data,
    work:          data.work          ?? [],
    workVotes:     data.workVotes     ?? [],
    workReactions: data.workReactions ?? [],
  };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface StoreCtx {
  data:       AppData;
  loading:    boolean;
  refreshing: boolean;                   // a manual/pull-to-refresh reload is in flight
  meId:       string;                    // current user's ID in the data model
  dispatch:   (action: Action) => void;
  reload:     () => Promise<void>;       // re-fetch everything from the backend
  memberById: Map<string, Member>;
  groupById:  Map<string, Group>;
}

const Ctx = createContext<StoreCtx | null>(null);
const EMPTY: AppData = { members: [], groups: [], expenses: [], settlements: [], work: [], workVotes: [], workReactions: [] };

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

    // 6. Work ledger — entries for my groups, plus their votes & reactions
    const { data: workRows } = groupIds.length > 0
      ? await supabase.from("work_entries").select("*").in("group_id", groupIds).order("date", { ascending: false })
      : { data: [] };

    const workIds = (workRows ?? []).map((w: any) => w.id);
    const [voteRes, reactionRes] = await Promise.all([
      workIds.length > 0
        ? supabase.from("work_votes").select("*").in("work_id", workIds)
        : Promise.resolve({ data: [] }),
      workIds.length > 0
        ? supabase.from("work_reactions").select("*").in("work_id", workIds)
        : Promise.resolve({ data: [] }),
    ]);

    return {
      members:       Array.from(memberMap.values()),
      groups,
      expenses,
      settlements:   (settlementRows ?? []).map(dbToSettlement),
      work:          (workRows ?? []).map(dbToWork),
      workVotes:     (voteRes.data ?? []).map(dbToVote),
      workReactions: (reactionRes.data ?? []).map(dbToReaction),
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
function dbToWork(row: any): WorkEntry {
  return {
    id: row.id, groupId: row.group_id, createdBy: row.created_by,
    title: row.title, description: row.description ?? "", category: row.category,
    effort: row.effort, durationMinutes: Number(row.duration_minutes) || 0,
    images: row.images ?? [], date: row.date, createdAt: row.created_at,
  };
}
function dbToVote(row: any): WorkVote {
  return { id: row.id, workId: row.work_id, userId: row.user_id, vote: row.vote, createdAt: row.created_at };
}
function dbToReaction(row: any): WorkReaction {
  return { id: row.id, workId: row.work_id, userId: row.user_id, emoji: row.emoji, createdAt: row.created_at };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [data, dispatch] = useReducer(reducer, EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  // meId: which member ID represents "me" in this session
  const meId = user?.id ?? "me";

  // Fetch everything for the current user from the backend into local state.
  const fetchAll = useCallback(async () => {
    if (!user) return;
    let loaded: AppData | null = null;

    if (isSupabaseConfigured) {
      loaded = await loadFromSupabase(user.id);
    } else {
      loaded = await loadLocal(user.id);
    }

    // First login: start empty, just add self as a member
    if (!loaded || loaded.members.length === 0) {
      const me: Member = { id: user.id, name: user.displayName, color: "#34d399" };
      loaded = { ...EMPTY, members: [me] };
      if (!isSupabaseConfigured) await saveLocal(user.id, loaded);
    }

    dispatch({ type: "LOAD", data: normalize(loaded) });
  }, [user?.id]);

  // Manual refresh — re-pull from the backend (e.g. to see others' verifications).
  const reload = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await fetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, fetchAll]);

  useEffect(() => {
    if (!user) { dispatch({ type: "LOAD", data: EMPTY }); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);

    (async () => {
      await fetchAll();
      if (!cancelled) setLoading(false);
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

        case "ADD_WORK":
          await supabase.from("work_entries").insert({
            id:               action.entry.id,
            group_id:         action.entry.groupId,
            created_by:       action.entry.createdBy,
            title:            action.entry.title,
            description:      action.entry.description,
            category:         action.entry.category,
            effort:           action.entry.effort,
            duration_minutes: action.entry.durationMinutes,
            images:           action.entry.images,
            date:             action.entry.date,
            created_at:       action.entry.createdAt,
          });
          break;

        case "DELETE_WORK":
          await supabase.from("work_reactions").delete().eq("work_id", action.id);
          await supabase.from("work_votes").delete().eq("work_id", action.id);
          await supabase.from("work_entries").delete().eq("id", action.id);
          break;

        case "SET_VOTE":
          // one vote per (work, user) — upsert on the composite unique key
          await supabase.from("work_votes").upsert({
            id:         action.vote.id,
            work_id:    action.vote.workId,
            user_id:    action.vote.userId,
            vote:       action.vote.vote,
            created_at: action.vote.createdAt,
          }, { onConflict: "work_id,user_id" });
          break;

        case "RETRACT_VOTE":
          await supabase.from("work_votes").delete()
            .eq("work_id", action.workId).eq("user_id", action.userId);
          break;

        case "ADD_REACTION":
          await supabase.from("work_reactions").insert({
            id:         action.reaction.id,
            work_id:    action.reaction.workId,
            user_id:    action.reaction.userId,
            emoji:      action.reaction.emoji,
            created_at: action.reaction.createdAt,
          });
          break;

        case "REMOVE_REACTION":
          await supabase.from("work_reactions").delete()
            .eq("work_id", action.workId).eq("user_id", action.userId).eq("emoji", action.emoji);
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
    <Ctx.Provider value={{ data, loading, refreshing, meId, dispatch: wrappedDispatch, reload, memberById, groupById }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}
