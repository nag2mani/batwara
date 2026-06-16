import React from "react";
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "./Icon";
import type { Expense } from "../lib/types";
import { formatDateLong, formatMoney } from "../lib/utils";
import { useStore } from "../store/StoreContext";
import CategoryIcon from "./CategoryIcon";
import { C } from "../theme/colors";

interface Props {
  expense: Expense | null;
  visible: boolean;
  onClose: () => void;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.infoRow, !last && s.infoDivider]}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

export default function ExpenseDetailModal({ expense, visible, onClose }: Props) {
  const { memberById, groupById, dispatch } = useStore();

  if (!expense) return null;

  const group = expense.groupId ? groupById.get(expense.groupId) : undefined;
  const payer = expense.paidBy ? memberById.get(expense.paidBy) : undefined;
  const isGroup = expense.type === "group";

  function confirmDelete() {
    Alert.alert("Delete expense", `Delete "${expense!.description}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          dispatch({ type: "DELETE_EXPENSE", id: expense!.id });
          onClose();
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.container} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Expense details</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={C.textMid} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={s.hero}>
            <CategoryIcon category={expense.category} size={26} />
            <Text style={s.amount}>{formatMoney(expense.amount, true)}</Text>
            <Text style={s.desc}>{expense.description}</Text>
            <View style={[s.badge, { backgroundColor: isGroup ? C.green + "1a" : C.amber + "1a" }]}>
              <Text style={[s.badgeText, { color: isGroup ? C.green : C.amber }]}>
                {isGroup ? "Group expense" : "Personal expense"}
              </Text>
            </View>
          </View>

          {/* Info */}
          <View style={s.card}>
            <InfoRow label="Category" value={expense.category} />
            <InfoRow label="Date" value={formatDateLong(expense.date)} last={!group && !payer && !expense.splitMethod} />
            {group && <InfoRow label="Group" value={`${group.emoji} ${group.name}`} last={!payer && !expense.splitMethod} />}
            {payer && <InfoRow label="Paid by" value={payer.name} last={!expense.splitMethod} />}
            {expense.splitMethod && <InfoRow label="Split method" value={cap(expense.splitMethod)} last />}
          </View>

          {/* Split breakdown */}
          {expense.splits && expense.splits.length > 0 && (
            <>
              <Text style={s.sectionLabel}>Split breakdown</Text>
              <View style={s.card}>
                {expense.splits.map((sp, i) => {
                  const m = memberById.get(sp.memberId);
                  const paid = sp.memberId === expense.paidBy;
                  return (
                    <View key={sp.memberId} style={[s.splitRow, i > 0 && s.infoDivider]}>
                      <View style={s.splitWho}>
                        <View style={[s.dot, { backgroundColor: m?.color ?? C.textMid }]} />
                        <Text style={s.splitName}>{m?.name ?? "Unknown"}</Text>
                        {paid && <Text style={s.paidTag}>paid</Text>}
                      </View>
                      <Text style={s.splitAmount}>{formatMoney(sp.amount, true)}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>

        {/* Delete */}
        <TouchableOpacity style={s.deleteBtn} onPress={confirmDelete} activeOpacity={0.85}>
          <Ionicons name="trash-outline" size={18} color={C.red} />
          <Text style={s.deleteText}>Delete expense</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20 },
  header:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16 },
  title:        { color: C.text, fontSize: 20, fontWeight: "700" },
  scroll:       { paddingBottom: 24 },
  hero:         { alignItems: "center", gap: 8, paddingVertical: 20 },
  amount:       { color: C.text, fontSize: 34, fontWeight: "700", letterSpacing: -0.5, marginTop: 6 },
  desc:         { color: C.textMid, fontSize: 16, textAlign: "center" },
  badge:        { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 4 },
  badgeText:    { fontSize: 12, fontWeight: "700" },
  card:         { backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: C.border },
  infoRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
  infoDivider:  { borderBottomWidth: 1, borderBottomColor: C.border },
  infoLabel:    { color: C.textMid, fontSize: 14 },
  infoValue:    { color: C.text, fontSize: 14, fontWeight: "600", flexShrink: 1, textAlign: "right", marginLeft: 12 },
  sectionLabel: { color: C.textMid, fontSize: 13, fontWeight: "500", marginTop: 20, marginBottom: 8 },
  splitRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
  splitWho:     { flexDirection: "row", alignItems: "center", gap: 10 },
  dot:          { width: 10, height: 10, borderRadius: 5 },
  splitName:    { color: C.text, fontSize: 15 },
  paidTag:      { color: C.green, fontSize: 11, fontWeight: "700", backgroundColor: C.green + "1a", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, overflow: "hidden" },
  splitAmount:  { color: C.text, fontSize: 15, fontWeight: "600" },
  deleteBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.red + "1a", borderRadius: 14, paddingVertical: 15, marginVertical: 12, borderWidth: 1, borderColor: C.red + "40" },
  deleteText:   { color: C.red, fontWeight: "700", fontSize: 15 },
});
