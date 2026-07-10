import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Modal, Pressable, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PieChart } from "react-native-chart-kit";
import { Ionicons } from "../components/Icon";
import { computePairwiseBalances } from "../lib/splitwise";
import { lendingPerspective, lendingInvolvesMe } from "../lib/lending";
import { useStore } from "../store/StoreContext";
import { formatMoney, round2 } from "../lib/utils";
import { CATEGORY_META, type Category } from "../lib/types";
import ExpenseRow from "../components/ExpenseRow";
import WorkRow from "../components/WorkRow";
import LendingRow from "../components/LendingRow";
import SettleUpModal from "../components/SettleUpModal";
import AddExpenseModal from "../components/AddExpenseModal";
import AddWorkModal from "../components/AddWorkModal";
import AddLendingModal from "../components/AddLendingModal";
import CreateGroupModal from "../components/CreateGroupModal";
import CategoryBreakdownModal from "../components/CategoryBreakdownModal";
import AddFab from "../components/AddFab";
import DateRangePicker, { computeRange, type RangeKey, type DateRange } from "../components/DateRangePicker";
import { C } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeContext";

const { width } = Dimensions.get("window");

export default function DashboardScreen() {
  const s = useThemedStyles(makeStyles);
  const { data, memberById, meId } = useStore();
  const [settleVisible,  setSettleVisible]  = useState(false);
  const [chooserVisible, setChooserVisible] = useState(false);
  const [addVisible,     setAddVisible]     = useState(false);
  const [addWorkVisible, setAddWorkVisible] = useState(false);
  const [addLendVisible, setAddLendVisible] = useState(false);
  const [newGroupVisible, setNewGroupVisible] = useState(false);
  const [catVisible,     setCatVisible]     = useState(false);
  const [rangeKey,       setRangeKey]       = useState<RangeKey>("30d");
  const [range,          setRange]          = useState<DateRange>(() => computeRange("30d"));

  const inRange = (iso: string) => {
    const t = new Date(iso).getTime();
    if (range.startMs != null && t < range.startMs) return false;
    if (range.endMs   != null && t > range.endMs)   return false;
    return true;
  };
  const ranged = data.expenses.filter((e) => inRange(e.date));

  const groupRangeTotal    = ranged.filter((e) => e.type === "group").reduce((s, e) => s + e.amount, 0);
  const personalRangeTotal = ranged.filter((e) => e.type === "personal").reduce((s, e) => s + e.amount, 0);

  // Per-person balances from group expenses, then fold in unsettled loans so
  // the net balance also reflects money lent (+) and borrowed (−).
  const combined = new Map<string, { name: string; color: string; amount: number }>();
  const addTo = (key: string, name: string, color: string, delta: number) => {
    const cur = combined.get(key);
    if (cur) cur.amount += delta;
    else combined.set(key, { name, color, amount: delta });
  };

  for (const [otherId, amt] of computePairwiseBalances(data.expenses, data.settlements, meId)) {
    const m = memberById.get(otherId);
    addTo(otherId, m?.name ?? "Someone", m?.color ?? C.textMid, amt);
  }

  // Outstanding loans (current state, not range-scoped).
  let lentOutstanding = 0;
  let borrowedOutstanding = 0;
  for (const l of data.lendings) {
    if (l.settledAt || !lendingInvolvesMe(l, meId)) continue;
    const p = lendingPerspective(l, meId, memberById);
    const key = p.otherId ?? `name:${p.otherName}`;
    if (p.theyOweMe) {
      lentOutstanding += l.amount;
      addTo(key, p.otherName, p.otherColor ?? C.textMid, l.amount);
    } else {
      borrowedOutstanding += l.amount;
      addTo(key, p.otherName, p.otherColor ?? C.textMid, -l.amount);
    }
  }

  const myBalance = round2([...combined.values()].reduce((s, e) => s + e.amount, 0));
  // Direct, per-person position (group debts + loans), biggest first.
  const myDebts = [...combined.entries()]
    .filter(([, e]) => Math.abs(e.amount) > 0.005)
    .map(([key, e]) => ({ key, name: e.name, color: e.color, amount: Math.abs(e.amount), theyOweMe: e.amount > 0 }))
    .sort((a, b) => b.amount - a.amount);

  // Category breakdown for pie chart
  const categoryTotals = ranged.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  const pieData = Object.entries(categoryTotals)
    .filter(([, v]) => v > 0)
    .map(([cat, value]) => ({
      name: cat,
      population: value,
      color: CATEGORY_META[cat as Category]?.color ?? C.textMid,
      legendFontColor: C.textMid,
      legendFontSize: 12,
    }))
    // Highest percentage first, so both the legend and the detail list are ordered.
    .sort((a, b) => b.population - a.population);

  const rangedTotal = pieData.reduce((sum, d) => sum + d.population, 0);
  const categoryRows = pieData.map((d) => ({
    name:  d.name,
    value: d.population,
    color: d.color,
    pct:   rangedTotal > 0 ? (d.population / rangedTotal) * 100 : 0,
  }));

  // Recent activity — expenses, work logs AND loans, merged chronologically.
  const recentFeed = [
    ...ranged.map((e) => ({ kind: "expense" as const, id: e.id, date: e.date, expense: e })),
    ...data.work
      .filter((w) => inRange(w.date))
      .map((w) => ({ kind: "work" as const, id: w.id, date: w.date, work: w })),
    ...data.lendings
      .filter((l) => inRange(l.date))
      .map((l) => ({ kind: "lending" as const, id: l.id, date: l.date, lending: l })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7);

  // Quick-add chooser: pick what to log, then open the matching modal.
  function choose(kind: "expense" | "lending" | "work" | "group") {
    setChooserVisible(false);
    if (kind === "expense") setAddVisible(true);
    else if (kind === "lending") setAddLendVisible(true);
    else if (kind === "group") setNewGroupVisible(true);
    else if (kind === "work") {
      if (data.groups.length === 0) {
        Alert.alert("No groups yet", "Create a group first to log work.");
        return;
      }
      setAddWorkVisible(true);
    }
  }

  const QUICK_ADD = [
    { kind: "expense" as const, label: "Expense",       sub: "Personal or group spending", icon: "receipt-outline",         color: C.green },
    { kind: "lending" as const, label: "Lend / Borrow", sub: "Money you lent or borrowed", icon: "swap-horizontal-outline", color: C.sky },
    { kind: "work"    as const, label: "Log work",      sub: "Household chore",            icon: "construct-outline",       color: C.amber },
    { kind: "group"   as const, label: "New group",     sub: "Create a group to share",    icon: "people-outline",          color: C.purple },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.pageHeader}>
          <View style={s.headerLeft}>
            <Text style={s.logoText}>✦ Batwara</Text>
          </View>
          <DateRangePicker
            rangeKey={rangeKey}
            label={range.label}
            onChange={(key, r) => { setRangeKey(key); setRange(r); }}
          />
        </View>

        {/* Two summary cards */}
        <View style={s.twoCol}>
          <View style={[s.card, s.halfCard]}>
            <View style={s.miniIconRow}>
              <Ionicons name="people-outline" size={15} color={C.green} />
              <Text style={s.miniLabel}>Group Expense</Text>
            </View>
            <Text style={s.miniAmount}>{formatMoney(groupRangeTotal)}</Text>
            <Text style={s.miniSub}>{range.label.toLowerCase()}</Text>
          </View>
          <View style={[s.card, s.halfCard]}>
            <View style={s.miniIconRow}>
              <Ionicons name="person-outline" size={15} color={C.amber} />
              <Text style={[s.miniLabel, { color: C.amber }]}>Personal Expense</Text>
            </View>
            <Text style={[s.miniAmount, { color: C.amber }]}>{formatMoney(personalRangeTotal)}</Text>
            <Text style={s.miniSub}>{range.label.toLowerCase()}</Text>
          </View>
        </View>

        {/* Outstanding loans */}
        {(lentOutstanding > 0.005 || borrowedOutstanding > 0.005) && (
          <View style={s.twoCol}>
            <View style={[s.card, s.halfCard]}>
              <View style={s.miniIconRow}>
                <Ionicons name="arrow-up" size={15} color={C.green} />
                <Text style={s.miniLabel}>You lent</Text>
              </View>
              <Text style={[s.miniAmount, { color: C.green }]}>{formatMoney(lentOutstanding)}</Text>
              <Text style={s.miniSub}>outstanding</Text>
            </View>
            <View style={[s.card, s.halfCard]}>
              <View style={s.miniIconRow}>
                <Ionicons name="arrow-down" size={15} color={C.red} />
                <Text style={[s.miniLabel, { color: C.red }]}>You borrowed</Text>
              </View>
              <Text style={[s.miniAmount, { color: C.red }]}>{formatMoney(borrowedOutstanding)}</Text>
              <Text style={s.miniSub}>outstanding</Text>
            </View>
          </View>
        )}

        {/* Net balance card — tap to settle up */}
        <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={() => setSettleVisible(true)}>
          <View style={s.cardRow}>
            <Text style={s.cardLabel}>Your net balance</Text>
            <View style={s.tapHint}>
              <Text style={s.tapHintText}>Settle up</Text>
              <Ionicons name="chevron-forward" size={15} color={C.textDim} />
            </View>
          </View>
          <Text style={[s.balanceAmount, { color: myBalance >= 0 ? C.green : C.red }]}>
            {myBalance >= 0 ? "+" : ""}{formatMoney(myBalance)}
          </Text>
          <Text style={s.balanceHint}>
            {myBalance > 0.005 ? "you are owed overall"
              : myBalance < -0.005 ? "you owe overall"
              : "you're all settled"}
          </Text>

          {myDebts.length > 0 && (
            <View style={s.debtList}>
              {myDebts.slice(0, 5).map((d) => (
                <View key={d.key} style={s.debtRow}>
                  <Text style={s.debtLine}>
                    {d.theyOweMe ? "" : "You owe "}
                    <Text style={{ color: d.color }}>{d.name}</Text>
                    {d.theyOweMe ? " owes you" : ""}
                  </Text>
                  <Text style={[s.debtAmount, { color: d.theyOweMe ? C.green : C.red }]}>
                    {formatMoney(d.amount)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>

        {/* Spending chart */}
        {pieData.length > 0 && (
          <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={() => setCatVisible(true)}>
            <View style={s.cardRow}>
              <Text style={s.cardLabel}>By category</Text>
              <View style={s.tapHint}>
                <Text style={s.tapHintText}>Details</Text>
                <Ionicons name="chevron-forward" size={15} color={C.textDim} />
              </View>
            </View>
            <PieChart
              data={pieData}
              width={width - 64}
              height={180}
              chartConfig={{
                color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
                labelColor: () => C.textMid,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="0"
              absolute={false}
            />
          </TouchableOpacity>
        )}

        {/* Recent activity */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Last 7 activities</Text>
          {recentFeed.length === 0
            ? <Text style={s.empty}>No activity yet</Text>
            : recentFeed.map((item) => (
                <React.Fragment key={item.id}>
                  {item.kind === "expense"
                    ? <ExpenseRow expense={item.expense} />
                    : item.kind === "work"
                    ? <WorkRow entry={item.work} />
                    : <LendingRow lending={item.lending} />}
                  <View style={s.divider} />
                </React.Fragment>
              ))
          }
        </View>
      </ScrollView>

      <AddFab onPress={() => setChooserVisible(true)} />

      {/* Quick-add chooser */}
      <Modal visible={chooserVisible} transparent animationType="fade" onRequestClose={() => setChooserVisible(false)}>
        <Pressable style={s.sheetBackdrop} onPress={() => setChooserVisible(false)}>
          <Pressable style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Add new</Text>
            {QUICK_ADD.map((opt) => (
              <TouchableOpacity key={opt.kind} style={s.sheetRow} onPress={() => choose(opt.kind)} activeOpacity={0.7}>
                <View style={[s.sheetIcon, { backgroundColor: opt.color + "1a" }]}>
                  <Ionicons name={opt.icon as any} size={20} color={opt.color} />
                </View>
                <View style={s.flex}>
                  <Text style={s.sheetLabel}>{opt.label}</Text>
                  <Text style={s.sheetSub}>{opt.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.textDim} />
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <SettleUpModal visible={settleVisible} onClose={() => setSettleVisible(false)} />
      <AddExpenseModal visible={addVisible} onClose={() => setAddVisible(false)} />
      <AddWorkModal
        visible={addWorkVisible}
        onClose={() => setAddWorkVisible(false)}
        groupId={data.groups[0]?.id ?? ""}
      />
      <AddLendingModal visible={addLendVisible} onClose={() => setAddLendVisible(false)} />
      <CreateGroupModal visible={newGroupVisible} onClose={() => setNewGroupVisible(false)} />
      <CategoryBreakdownModal
        visible={catVisible}
        onClose={() => setCatVisible(false)}
        rows={categoryRows}
        total={rangedTotal}
        rangeLabel={range.label}
      />
    </SafeAreaView>
  );
}

const makeStyles = () => StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },
  flex:        { flex: 1 },
  scroll:      { flex: 1 },
  sheetBackdrop:{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet:       { backgroundColor: C.bg2, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, gap: 8 },
  sheetHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: C.border2, marginBottom: 8 },
  sheetTitle:  { color: C.text, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  sheetRow:    { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  sheetIcon:   { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sheetLabel:  { color: C.text, fontSize: 16, fontWeight: "600" },
  sheetSub:    { color: C.textMid, fontSize: 12, marginTop: 2 },
  content:     { padding: 16, gap: 12, paddingBottom: 96 },
  pageHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  headerLeft:  { flex: 1 },
  logoText:    { color: C.text, fontSize: 22, fontWeight: "700" },
  card:        { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  cardRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLabel:   { color: C.textMid, fontSize: 13, fontWeight: "500", marginBottom: 8 },
  tapHint:     { flexDirection: "row", alignItems: "center", gap: 2 },
  tapHintText: { color: C.textDim, fontSize: 12, fontWeight: "500" },
  twoCol:      { flexDirection: "row", gap: 12 },
  halfCard:    { flex: 1, gap: 4 },
  miniIconRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 },
  miniLabel:   { color: C.green, fontSize: 13, fontWeight: "600" },
  miniAmount:  { color: C.text, fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  miniSub:     { color: C.textDim, fontSize: 11 },
  balanceAmount:{ fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  balanceHint: { color: C.textDim, fontSize: 12, marginTop: 2 },
  debtList:    { marginTop: 12, gap: 8 },
  debtRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  debtLine:    { color: C.textMid, fontSize: 14, lineHeight: 20, flex: 1 },
  debtAmount:  { fontSize: 14, fontWeight: "600" },
  divider:     { height: 1, backgroundColor: C.border },
  empty:       { color: C.textDim, fontSize: 14, textAlign: "center", paddingVertical: 16 },
});
