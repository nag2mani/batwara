import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Group } from "../lib/types";
import { computeBalances, simplifyDebts } from "../lib/splitwise";
import { useStore } from "../store/StoreContext";
import { formatMoney } from "../lib/utils";
import GroupCard from "../components/GroupCard";
import CreateGroupModal from "../components/CreateGroupModal";
import AddExpenseModal from "../components/AddExpenseModal";
import SettleUpModal from "../components/SettleUpModal";
import ExpenseRow from "../components/ExpenseRow";
import Avatar from "../components/Avatar";
import { C } from "../theme/colors";

export default function GroupsScreen() {
  const { data, memberById } = useStore();
  const [createVisible, setCreateVisible] = useState(false);
  const [detailGroup,   setDetailGroup]   = useState<Group | null>(null);
  const [addVisible,    setAddVisible]    = useState(false);
  const [settleVisible, setSettleVisible] = useState(false);

  const detailExpenses = detailGroup
    ? data.expenses.filter((e) => e.groupId === detailGroup.id)
    : [];

  const detailBalances = detailGroup
    ? computeBalances(data.expenses, data.settlements, detailGroup.id)
    : new Map<string, number>();
  const detailDebts = simplifyDebts(detailBalances);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Groups</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setCreateVisible(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color={C.bg} />
        </TouchableOpacity>
      </View>

      {data.groups.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>👥</Text>
          <Text style={s.emptyText}>No groups yet</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => setCreateVisible(true)}>
            <Text style={s.emptyBtnText}>Create your first group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data.groups}
          keyExtractor={(g) => g.id}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <View style={s.cardWrap}>
              <GroupCard group={item} onPress={() => setDetailGroup(item)} />
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Group detail modal */}
      {detailGroup && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setDetailGroup(null)}
        >
          <View style={s.detailContainer}>
            <View style={s.detailHeader}>
              <View style={s.detailTitle}>
                <Text style={s.detailEmoji}>{detailGroup.emoji}</Text>
                <Text style={s.detailName}>{detailGroup.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setDetailGroup(null)}>
                <Ionicons name="close" size={24} color={C.textMid} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Members */}
              <Text style={s.sectionLabel}>Members</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.membersRow}>
                {detailGroup.memberIds.map((id) => {
                  const m = memberById.get(id);
                  if (!m) return null;
                  return (
                    <View key={id} style={s.memberChip}>
                      <Avatar name={m.name} color={m.color} size="sm" />
                      <Text style={s.memberChipName}>{m.name}</Text>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Debts */}
              <View style={s.sectionRow}>
                <Text style={s.sectionLabel}>Simplified debts</Text>
                <TouchableOpacity style={s.settleBtn} onPress={() => setSettleVisible(true)}>
                  <Text style={s.settleBtnText}>Settle up</Text>
                </TouchableOpacity>
              </View>
              {detailDebts.length === 0 ? (
                <Text style={s.allSettled}>🎉 All settled!</Text>
              ) : (
                detailDebts.map((d, i) => {
                  const from = memberById.get(d.from);
                  const to   = memberById.get(d.to);
                  if (!from || !to) return null;
                  return (
                    <View key={i} style={s.debtRow}>
                      <Avatar name={from.name} color={from.color} size="sm" />
                      <Text style={s.debtText}>
                        <Text style={{ color: from.color }}>{from.name}</Text>
                        {" owes "}
                        <Text style={{ color: to.color }}>{to.name}</Text>
                      </Text>
                      <Text style={s.debtAmount}>{formatMoney(d.amount)}</Text>
                    </View>
                  );
                })
              )}

              {/* Expenses */}
              <View style={s.sectionRow}>
                <Text style={s.sectionLabel}>Expenses</Text>
                <TouchableOpacity style={s.addExpBtn} onPress={() => setAddVisible(true)}>
                  <Ionicons name="add" size={16} color={C.green} />
                  <Text style={s.addExpText}>Add</Text>
                </TouchableOpacity>
              </View>

              {detailExpenses.length === 0 ? (
                <Text style={s.noExpenses}>No expenses yet</Text>
              ) : (
                detailExpenses.map((e, i) => (
                  <React.Fragment key={e.id}>
                    <ExpenseRow expense={e} />
                    {i < detailExpenses.length - 1 && <View style={s.divider} />}
                  </React.Fragment>
                ))
              )}
            </ScrollView>
          </View>

          <AddExpenseModal
            visible={addVisible}
            onClose={() => setAddVisible(false)}
            defaultGroupId={detailGroup.id}
          />
          <SettleUpModal
            visible={settleVisible}
            onClose={() => setSettleVisible(false)}
            groupId={detailGroup.id}
          />
        </Modal>
      )}

      <CreateGroupModal visible={createVisible} onClose={() => setCreateVisible(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: C.bg },
  header:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title:           { color: C.text, fontSize: 24, fontWeight: "700" },
  addBtn:          { backgroundColor: C.green, borderRadius: 12, padding: 8 },
  list:            { padding: 12, paddingBottom: 32 },
  row:             { gap: 12 },
  cardWrap:        { flex: 1 },
  empty:           { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyIcon:       { fontSize: 48 },
  emptyText:       { color: C.textMid, fontSize: 16 },
  emptyBtn:        { backgroundColor: C.green, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnText:    { color: C.bg, fontWeight: "700", fontSize: 15 },
  // Detail modal
  detailContainer: { flex: 1, backgroundColor: C.bg, padding: 20 },
  detailHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  detailTitle:     { flexDirection: "row", alignItems: "center", gap: 10 },
  detailEmoji:     { fontSize: 28 },
  detailName:      { color: C.text, fontSize: 22, fontWeight: "700" },
  sectionLabel:    { color: C.textMid, fontSize: 13, fontWeight: "500", marginBottom: 10, marginTop: 20 },
  sectionRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 },
  membersRow:      { flexDirection: "row" },
  memberChip:      { alignItems: "center", gap: 4, marginRight: 16 },
  memberChipName:  { color: C.textMid, fontSize: 12 },
  allSettled:      { color: C.green, fontSize: 15, paddingVertical: 8 },
  debtRow:         { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  debtText:        { flex: 1, color: C.textMid, fontSize: 14 },
  debtAmount:      { color: C.amber, fontWeight: "600", fontSize: 15 },
  settleBtn:       { backgroundColor: C.green, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  settleBtnText:   { color: C.bg, fontWeight: "700", fontSize: 13 },
  addExpBtn:       { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.green + "1a", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: C.green + "33" },
  addExpText:      { color: C.green, fontWeight: "600", fontSize: 13 },
  noExpenses:      { color: C.textDim, fontSize: 14, paddingVertical: 8 },
  divider:         { height: 1, backgroundColor: C.border },
});
