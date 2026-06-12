import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PieChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";
import { computeBalances, simplifyDebts } from "../lib/splitwise";
import { useStore } from "../store/StoreContext";
import { formatMoney, isSameMonth, monthLabel } from "../lib/utils";
import { CATEGORY_META } from "../lib/types";
import CategoryIcon from "../components/CategoryIcon";
import ExpenseRow from "../components/ExpenseRow";
import SettleUpModal from "../components/SettleUpModal";
import AddExpenseModal from "../components/AddExpenseModal";
import { C } from "../theme/colors";

const { width } = Dimensions.get("window");

export default function DashboardScreen() {
  const { data, memberById, meId } = useStore();
  const [settleVisible,  setSettleVisible]  = useState(false);
  const [addVisible,     setAddVisible]     = useState(false);

  const thisMonth = data.expenses.filter((e) => isSameMonth(e.date));

  const groupMonthTotal    = thisMonth.filter((e) => e.type === "group").reduce((s, e) => s + e.amount, 0);
  const personalMonthTotal = thisMonth.filter((e) => e.type === "personal").reduce((s, e) => s + e.amount, 0);

  const balances  = computeBalances(data.expenses, data.settlements);
  const myBalance = balances.get(meId) ?? 0;
  const debts     = simplifyDebts(balances);

  // Category breakdown for pie chart
  const categoryTotals = thisMonth.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  const pieData = Object.entries(categoryTotals)
    .filter(([, v]) => v > 0)
    .map(([cat, value]) => ({
      name: cat,
      population: value,
      color: CATEGORY_META[cat as any]?.color ?? C.textMid,
      legendFontColor: C.textMid,
      legendFontSize: 12,
    }));

  const recentExpenses = data.expenses.slice(0, 5);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.pageHeader}>
          <View>
            <Text style={s.logoText}>✦ Batwara</Text>
            <Text style={s.subtitle}>{monthLabel()}</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setAddVisible(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color={C.bg} />
            <Text style={s.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Two summary cards */}
        <View style={s.twoCol}>
          <View style={[s.card, s.halfCard]}>
            <View style={s.miniIconRow}>
              <Ionicons name="people-outline" size={15} color={C.green} />
              <Text style={s.miniLabel}>Group</Text>
            </View>
            <Text style={s.miniAmount}>{formatMoney(groupMonthTotal)}</Text>
            <Text style={s.miniSub}>this month</Text>
          </View>
          <View style={[s.card, s.halfCard]}>
            <View style={s.miniIconRow}>
              <Ionicons name="person-outline" size={15} color={C.amber} />
              <Text style={[s.miniLabel, { color: C.amber }]}>Personal</Text>
            </View>
            <Text style={[s.miniAmount, { color: C.amber }]}>{formatMoney(personalMonthTotal)}</Text>
            <Text style={s.miniSub}>this month</Text>
          </View>
        </View>

        {/* Net balance card */}
        <View style={s.card}>
          <View style={s.cardRow}>
            <Text style={s.cardLabel}>Your net balance</Text>
            <TouchableOpacity style={s.settleBtn} onPress={() => setSettleVisible(true)}>
              <Text style={s.settleBtnText}>Settle up</Text>
            </TouchableOpacity>
          </View>
          <Text style={[s.balanceAmount, { color: myBalance >= 0 ? C.green : C.red }]}>
            {myBalance >= 0 ? "+" : ""}{formatMoney(myBalance)}
          </Text>

          {debts.length > 0 && (
            <View style={s.debtList}>
              {debts.slice(0, 3).map((d, i) => {
                const from = memberById.get(d.from);
                const to   = memberById.get(d.to);
                if (!from || !to) return null;
                return (
                  <Text key={i} style={s.debtLine}>
                    <Text style={{ color: from.color }}>{from.name}</Text>
                    {" → "}
                    <Text style={{ color: to.color }}>{to.name}</Text>
                    {"  "}<Text style={{ color: C.amber }}>{formatMoney(d.amount)}</Text>
                  </Text>
                );
              })}
            </View>
          )}
        </View>

        {/* Spending chart */}
        {pieData.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardLabel}>By category</Text>
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
          </View>
        )}

        {/* Recent activity */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Recent activity</Text>
          {recentExpenses.length === 0
            ? <Text style={s.empty}>No expenses yet</Text>
            : recentExpenses.map((e) => (
                <React.Fragment key={e.id}>
                  <ExpenseRow expense={e} />
                  <View style={s.divider} />
                </React.Fragment>
              ))
          }
        </View>
      </ScrollView>

      <SettleUpModal visible={settleVisible} onClose={() => setSettleVisible(false)} />
      <AddExpenseModal visible={addVisible} onClose={() => setAddVisible(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },
  scroll:      { flex: 1 },
  content:     { padding: 16, gap: 12, paddingBottom: 32 },
  pageHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  logoText:    { color: C.text, fontSize: 22, fontWeight: "700" },
  subtitle:    { color: C.textMid, fontSize: 13, marginTop: 2 },
  addBtn:      { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.green, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText:  { color: C.bg, fontWeight: "700", fontSize: 14 },
  card:        { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  cardRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLabel:   { color: C.textMid, fontSize: 13, fontWeight: "500", marginBottom: 8 },
  twoCol:      { flexDirection: "row", gap: 12 },
  halfCard:    { flex: 1, gap: 4 },
  miniIconRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 },
  miniLabel:   { color: C.green, fontSize: 13, fontWeight: "600" },
  miniAmount:  { color: C.text, fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  miniSub:     { color: C.textDim, fontSize: 11 },
  balanceAmount:{ fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  settleBtn:   { backgroundColor: C.green, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  settleBtnText:{ color: C.bg, fontWeight: "700", fontSize: 13 },
  debtList:    { marginTop: 12, gap: 6 },
  debtLine:    { color: C.textMid, fontSize: 14, lineHeight: 20 },
  divider:     { height: 1, backgroundColor: C.border },
  empty:       { color: C.textDim, fontSize: 14, textAlign: "center", paddingVertical: 16 },
});
