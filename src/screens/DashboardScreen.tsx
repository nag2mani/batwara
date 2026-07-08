import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PieChart } from "react-native-chart-kit";
import { Ionicons } from "../components/Icon";
import { computeBalances, computePairwiseBalances } from "../lib/splitwise";
import { useStore } from "../store/StoreContext";
import { formatMoney } from "../lib/utils";
import { CATEGORY_META, type Category } from "../lib/types";
import ExpenseRow from "../components/ExpenseRow";
import WorkRow from "../components/WorkRow";
import LendingRow from "../components/LendingRow";
import SettleUpModal from "../components/SettleUpModal";
import AddExpenseModal from "../components/AddExpenseModal";
import CategoryBreakdownModal from "../components/CategoryBreakdownModal";
import AddFab from "../components/AddFab";
import DateRangePicker, { computeRange, type RangeKey, type DateRange } from "../components/DateRangePicker";
import { C } from "../theme/colors";

const { width } = Dimensions.get("window");

export default function DashboardScreen() {
  const { data, memberById, meId } = useStore();
  const [settleVisible,  setSettleVisible]  = useState(false);
  const [addVisible,     setAddVisible]     = useState(false);
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

  // Outstanding loans (current state, not range-scoped).
  const lentOutstanding     = data.lendings
    .filter((l) => l.lentBy === meId && !l.settledAt)
    .reduce((s, l) => s + l.amount, 0);
  const borrowedOutstanding = data.lendings
    .filter((l) => l.counterpartyId === meId && !l.settledAt)
    .reduce((s, l) => s + l.amount, 0);

  const myBalance = computeBalances(data.expenses, data.settlements).get(meId) ?? 0;
  // Direct balance between you and each other person (not globally simplified).
  const myDebts = [...computePairwiseBalances(data.expenses, data.settlements, meId).entries()]
    .filter(([, amt]) => Math.abs(amt) > 0.005)
    .map(([otherId, amt]) => ({ otherId, amount: Math.abs(amt), theyOweMe: amt > 0 }))
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
              {myDebts.slice(0, 5).map((d) => {
                const other = memberById.get(d.otherId);
                if (!other) return null;
                return (
                  <View key={d.otherId} style={s.debtRow}>
                    <Text style={s.debtLine}>
                      {d.theyOweMe ? "" : "You owe "}
                      <Text style={{ color: other.color }}>{other.name}</Text>
                      {d.theyOweMe ? " owes you" : ""}
                    </Text>
                    <Text style={[s.debtAmount, { color: d.theyOweMe ? C.green : C.red }]}>
                      {formatMoney(d.amount)}
                    </Text>
                  </View>
                );
              })}
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

      <AddFab onPress={() => setAddVisible(true)} />

      <SettleUpModal visible={settleVisible} onClose={() => setSettleVisible(false)} />
      <AddExpenseModal visible={addVisible} onClose={() => setAddVisible(false)} />
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

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },
  scroll:      { flex: 1 },
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
