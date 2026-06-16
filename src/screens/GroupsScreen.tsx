import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ScrollView, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "../components/Icon";
import type { Group } from "../lib/types";
import { computePairwiseBalances } from "../lib/splitwise";
import { useStore } from "../store/StoreContext";
import { formatMoney } from "../lib/utils";
import GroupCard from "../components/GroupCard";
import CreateGroupModal from "../components/CreateGroupModal";
import AddExpenseModal from "../components/AddExpenseModal";
import SettleUpModal from "../components/SettleUpModal";
import ExpenseRow from "../components/ExpenseRow";
import Avatar from "../components/Avatar";
import AddFab from "../components/AddFab";
import { C } from "../theme/colors";

export default function GroupsScreen() {
  const { data, memberById, meId, dispatch } = useStore();

  function confirmDeleteGroup(group: Group) {
    Alert.alert(
      "Delete group",
      `Delete "${group.name}" and all its expenses? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            dispatch({ type: "DELETE_GROUP", id: group.id });
            setDetailGroup(null);
          },
        },
      ],
    );
  }
  const [createVisible, setCreateVisible] = useState(false);
  const [detailGroup,   setDetailGroup]   = useState<Group | null>(null);
  const [addVisible,    setAddVisible]    = useState(false);
  const [settleVisible, setSettleVisible] = useState(false);

  const detailExpenses = detailGroup
    ? data.expenses.filter((e) => e.groupId === detailGroup.id)
    : [];

  // Your direct balance with each other member of this group.
  const myGroupDebts = detailGroup
    ? [...computePairwiseBalances(data.expenses, data.settlements, meId, detailGroup.id).entries()]
        .filter(([, amt]) => Math.abs(amt) > 0.005)
        .map(([otherId, amt]) => ({ otherId, amount: Math.abs(amt), theyOweMe: amt > 0 }))
        .sort((a, b) => b.amount - a.amount)
    : [];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Groups</Text>
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

      <AddFab onPress={() => setCreateVisible(true)} />

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
              <View style={s.detailActions}>
                <TouchableOpacity onPress={() => confirmDeleteGroup(detailGroup)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={22} color={C.red} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDetailGroup(null)}>
                  <Ionicons name="close" size={24} color={C.textMid} />
                </TouchableOpacity>
              </View>
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

              {/* Your balances */}
              <View style={s.sectionRow}>
                <Text style={s.sectionLabel}>Your balances</Text>
                <TouchableOpacity style={s.settleBtn} onPress={() => setSettleVisible(true)}>
                  <Text style={s.settleBtnText}>Settle up</Text>
                </TouchableOpacity>
              </View>
              {myGroupDebts.length === 0 ? (
                <Text style={s.allSettled}>🎉 All settled!</Text>
              ) : (
                myGroupDebts.map((d) => {
                  const other = memberById.get(d.otherId);
                  if (!other) return null;
                  return (
                    <View key={d.otherId} style={s.debtRow}>
                      <Avatar name={other.name} color={other.color} size="sm" />
                      <Text style={s.debtText}>
                        {d.theyOweMe ? "" : "You owe "}
                        <Text style={{ color: other.color }}>{other.name}</Text>
                        {d.theyOweMe ? " owes you" : ""}
                      </Text>
                      <Text style={[s.debtAmount, { color: d.theyOweMe ? C.green : C.red }]}>
                        {formatMoney(d.amount)}
                      </Text>
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
  list:            { padding: 12, paddingBottom: 96 },
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
  detailTitle:     { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  detailActions:   { flexDirection: "row", alignItems: "center", gap: 18 },
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
