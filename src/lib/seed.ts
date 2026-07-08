import type { AppData } from "./types";
import { daysAgoISO, uid } from "./utils";

const MEMBER_COLORS = [
  "#34d399", "#8b5cf6", "#f472b6", "#fbbf24", "#38bdf8", "#f87171",
];

export function buildSeedData(myName: string): AppData {
  const me = { id: "me", name: myName, color: "#34d399" };
  const aarav  = { id: uid("m"), name: "Aarav",  color: "#8b5cf6" };
  const priya  = { id: uid("m"), name: "Priya",  color: "#f472b6" };
  const rohan  = { id: uid("m"), name: "Rohan",  color: "#fbbf24" };
  const sneha  = { id: uid("m"), name: "Sneha",  color: "#38bdf8" };
  const kabir  = { id: uid("m"), name: "Kabir",  color: "#f87171" };

  const flat4b = {
    id: uid("g"), name: "Flat 4B", emoji: "🏠",
    memberIds: [me.id, aarav.id, priya.id, rohan.id],
    createdAt: daysAgoISO(90),
  };
  const goaTrip = {
    id: uid("g"), name: "Goa Trip", emoji: "🏖️",
    memberIds: [me.id, aarav.id, sneha.id, kabir.id, priya.id],
    createdAt: daysAgoISO(45),
  };
  const officeLunch = {
    id: uid("g"), name: "Office Lunch Club", emoji: "🍱",
    memberIds: [me.id, rohan.id, sneha.id],
    createdAt: daysAgoISO(30),
  };

  const expenses = [
    { id: uid("e"), description: "Monthly rent",      amount: 45000, category: "Rent"          as const, date: daysAgoISO(2),  type: "group"    as const, groupId: flat4b.id,     paidBy: me.id,    splitMethod: "equal" as const, splits: [{ memberId: me.id, amount: 11250 }, { memberId: aarav.id, amount: 11250 }, { memberId: priya.id, amount: 11250 }, { memberId: rohan.id, amount: 11250 }] },
    { id: uid("e"), description: "Groceries",         amount: 2800,  category: "Grocery"       as const, date: daysAgoISO(3),  type: "personal" as const },
    { id: uid("e"), description: "Electricity bill",  amount: 1200,  category: "Utilities"     as const, date: daysAgoISO(5),  type: "group"    as const, groupId: flat4b.id,     paidBy: aarav.id, splitMethod: "equal" as const, splits: [{ memberId: me.id, amount: 300 }, { memberId: aarav.id, amount: 300 }, { memberId: priya.id, amount: 300 }, { memberId: rohan.id, amount: 300 }] },
    { id: uid("e"), description: "Dinner at Barbeque Nation", amount: 3200, category: "Dining" as const, date: daysAgoISO(6),  type: "group"    as const, groupId: flat4b.id,     paidBy: priya.id, splitMethod: "equal" as const, splits: [{ memberId: me.id, amount: 800 }, { memberId: aarav.id, amount: 800 }, { memberId: priya.id, amount: 800 }, { memberId: rohan.id, amount: 800 }] },
    { id: uid("e"), description: "Goa hotel",         amount: 18000, category: "Entertainment" as const, date: daysAgoISO(40), type: "group"    as const, groupId: goaTrip.id,    paidBy: me.id,    splitMethod: "equal" as const, splits: [{ memberId: me.id, amount: 3600 }, { memberId: aarav.id, amount: 3600 }, { memberId: sneha.id, amount: 3600 }, { memberId: kabir.id, amount: 3600 }, { memberId: priya.id, amount: 3600 }] },
    { id: uid("e"), description: "Netflix",           amount: 649,   category: "Entertainment" as const, date: daysAgoISO(8),  type: "personal" as const },
    { id: uid("e"), description: "Team lunch",        amount: 1800,  category: "Dining"        as const, date: daysAgoISO(1),  type: "group"    as const, groupId: officeLunch.id, paidBy: rohan.id, splitMethod: "equal" as const, splits: [{ memberId: me.id, amount: 600 }, { memberId: rohan.id, amount: 600 }, { memberId: sneha.id, amount: 600 }] },
  ];

  const settlements = [
    { id: uid("s"), from: aarav.id, to: me.id, amount: 3600, date: daysAgoISO(35), groupId: goaTrip.id },
  ];

  // Work ledger demo data (all in Flat 4B — 4 members → 3 eligible voters → 2 approvals needed)
  const wDishes  = { id: uid("w"), groupId: flat4b.id, createdBy: priya.id, title: "Washed all the dishes",   description: "Cleared the sink after dinner.", category: "Cleaning"    as const, effort: "Easy"   as const, durationMinutes: 20, images: [] as string[], date: daysAgoISO(1), createdAt: daysAgoISO(1) };
  const wCook    = { id: uid("w"), groupId: flat4b.id, createdBy: aarav.id, title: "Cooked dinner for everyone", description: "Rajma chawal for the flat.", category: "Cooking" as const, effort: "Hard"   as const, durationMinutes: 75, images: [] as string[], date: daysAgoISO(2), createdAt: daysAgoISO(2) };
  const wGroc    = { id: uid("w"), groupId: flat4b.id, createdBy: me.id,    title: "Weekly grocery run",     description: "Restocked the kitchen.", category: "Shopping"    as const, effort: "Medium" as const, durationMinutes: 45, images: [] as string[], date: daysAgoISO(3), createdAt: daysAgoISO(3) };
  const wLaundry = { id: uid("w"), groupId: flat4b.id, createdBy: rohan.id, title: "Did the shared laundry",  description: "", category: "Laundry" as const, effort: "Medium" as const, durationMinutes: 40, images: [] as string[], date: daysAgoISO(0), createdAt: daysAgoISO(0) };

  const work = [wLaundry, wDishes, wGroc, wCook];

  const workVotes = [
    // Dishes → verified (2 approvals)
    { id: uid("v"), workId: wDishes.id, userId: me.id,    vote: "approve" as const, createdAt: daysAgoISO(1) },
    { id: uid("v"), workId: wDishes.id, userId: rohan.id, vote: "approve" as const, createdAt: daysAgoISO(1) },
    // Cooking → verified (2 approvals)
    { id: uid("v"), workId: wCook.id,   userId: me.id,    vote: "approve" as const, createdAt: daysAgoISO(2) },
    { id: uid("v"), workId: wCook.id,   userId: priya.id, vote: "approve" as const, createdAt: daysAgoISO(2) },
    // Grocery → 1 approval so far (still pending, needs 2)
    { id: uid("v"), workId: wGroc.id,   userId: aarav.id, vote: "approve" as const, createdAt: daysAgoISO(3) },
    // Laundry → no votes yet (pending)
  ];

  const workReactions = [
    { id: uid("rx"), workId: wDishes.id, userId: aarav.id, emoji: "👏" as const, createdAt: daysAgoISO(1) },
    { id: uid("rx"), workId: wCook.id,   userId: me.id,    emoji: "🔥" as const, createdAt: daysAgoISO(2) },
    { id: uid("rx"), workId: wCook.id,   userId: priya.id, emoji: "🙌" as const, createdAt: daysAgoISO(2) },
  ];

  return {
    members: [me, aarav, priya, rohan, sneha, kabir],
    groups: [flat4b, goaTrip, officeLunch],
    expenses,
    settlements,
    lendings: [],
    work,
    workVotes,
    workReactions,
  };
}
