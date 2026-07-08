import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "../components/Icon";
import { useStore } from "../store/StoreContext";
import { tallyWork } from "../lib/work";
import ExpenseRow from "../components/ExpenseRow";
import WorkCard from "../components/WorkCard";
import LendingRow from "../components/LendingRow";
import AddLendingModal from "../components/AddLendingModal";
import AddFab from "../components/AddFab";
import { C } from "../theme/colors";

type Filter = "group" | "personal" | "work" | "lending";

const FILTERS: { key: Filter; label: string; icon: string }[] = [
  { key: "group",    label: "Group",    icon: "people-outline" },
  { key: "personal", label: "Personal", icon: "person-outline" },
  { key: "lending",  label: "Lending",  icon: "swap-horizontal-outline" },
  { key: "work",     label: "Work",     icon: "construct-outline" },
];

export default function ExpensesScreen() {
  const { data, groupById, meId, reload, refreshing } = useStore();
  const [filter, setFilter] = useState<Filter>("group");
  const [addLendingVisible, setAddLendingVisible] = useState(false);

  const isWork    = filter === "work";
  const isLending = filter === "lending";

  const filteredExpenses = data.expenses.filter((e) => e.type === filter);

  // Loans involving me (either lent or borrowed), newest first.
  const lendings = data.lendings
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Work created by the current user that is still pending or has been verified
  // (rejected submissions are hidden here).
  const myWork = data.work
    .filter((w) =>
      w.createdBy === meId
      && tallyWork(w, data.workVotes, groupById.get(w.groupId)).status !== "rejected",
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Activity</Text>
        <TouchableOpacity
          onPress={reload}
          disabled={refreshing}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="refresh" size={22} color={refreshing ? C.textDim : C.green} />
        </TouchableOpacity>
      </View>

      {/* Segmented filter: Group / Personal / Work */}
      <View style={s.segment}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.segBtn, active && s.segBtnActive]}
              onPress={() => setFilter(f.key)}
            >
              <Ionicons name={f.icon as any} size={16} color={active ? C.green : C.textMid} />
              <Text style={[s.segText, active && { color: C.green }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {isLending ? (
        lendings.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="swap-horizontal-outline" size={48} color={C.textDim} />
            <Text style={s.emptyText}>No loans yet</Text>
            <Text style={s.emptyHint}>Tap + to log money you lent to a friend.</Text>
          </View>
        ) : (
          <FlatList
            data={lendings}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <LendingRow lending={item} />}
            ItemSeparatorComponent={() => <View style={s.sep} />}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={C.green} colors={[C.green]} />
            }
          />
        )
      ) : isWork ? (
        myWork.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="construct-outline" size={48} color={C.textDim} />
            <Text style={s.emptyText}>No work yet</Text>
          </View>
        ) : (
          <FlatList
            data={myWork}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <WorkCard entry={item} />}
            contentContainerStyle={s.workList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={C.green} colors={[C.green]} />
            }
          />
        )
      ) : filteredExpenses.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="receipt-outline" size={48} color={C.textDim} />
          <Text style={s.emptyText}>No {filter} expenses</Text>
        </View>
      ) : (
        <FlatList
          data={filteredExpenses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ExpenseRow expense={item} />}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={C.green} colors={[C.green]} />
          }
        />
      )}

      {isLending && <AddFab onPress={() => setAddLendingVisible(true)} />}
      <AddLendingModal visible={addLendingVisible} onClose={() => setAddLendingVisible(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title:       { color: C.text, fontSize: 24, fontWeight: "700" },
  segment:     { flexDirection: "row", backgroundColor: C.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: C.border, marginHorizontal: 16, marginTop: 8, marginBottom: 12 },
  segBtn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 9 },
  segBtnActive:{ backgroundColor: C.green + "1a" },
  segText:     { color: C.textMid, fontSize: 13, fontWeight: "600" },
  list:        { paddingHorizontal: 16, paddingBottom: 96 },
  workList:    { paddingHorizontal: 16, paddingBottom: 96, gap: 10 },
  sep:         { height: 1, backgroundColor: C.border },
  empty:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText:   { color: C.textMid, fontSize: 16 },
  emptyHint:   { color: C.textDim, fontSize: 13, textAlign: "center", paddingHorizontal: 40 },
});
