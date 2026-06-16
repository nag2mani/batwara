import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import type { Expense } from "../lib/types";
import { formatDate, formatMoney } from "../lib/utils";
import { useStore } from "../store/StoreContext";
import CategoryIcon from "./CategoryIcon";
import ExpenseDetailModal from "./ExpenseDetailModal";
import { C } from "../theme/colors";
import { Ionicons } from "./Icon";

interface Props {
  expense: Expense;
}

export default function ExpenseRow({ expense }: Props) {
  const { dispatch, groupById } = useStore();
  const group = expense.groupId ? groupById.get(expense.groupId) : undefined;
  const [detailVisible, setDetailVisible] = useState(false);

  const tag = group
    ? `${group.emoji} ${group.name}`
    : expense.type === "personal"
    ? "Personal"
    : "Group";

  function confirmDelete() {
    Alert.alert("Delete expense", `Delete "${expense.description}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => dispatch({ type: "DELETE_EXPENSE", id: expense.id }) },
    ]);
  }

  return (
    <>
      <TouchableOpacity style={s.row} onPress={() => setDetailVisible(true)} activeOpacity={0.6}>
        <CategoryIcon category={expense.category} size={18} />
        <View style={s.info}>
          <Text style={s.desc} numberOfLines={1}>{expense.description}</Text>
          <Text style={s.meta}>{formatDate(expense.date)}{"  ·  "}{tag}</Text>
        </View>
        <View style={s.right}>
          <Text style={s.amount}>{formatMoney(expense.amount)}</Text>
          <TouchableOpacity onPress={confirmDelete} style={s.del} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={16} color={C.red} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <ExpenseDetailModal
        expense={expense}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
      />
    </>
  );
}

const s = StyleSheet.create({
  row:    { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  info:   { flex: 1, gap: 3 },
  desc:   { color: C.text, fontSize: 15, fontWeight: "500" },
  meta:   { color: C.textMid, fontSize: 12 },
  right:  { alignItems: "flex-end", gap: 4 },
  amount: { color: C.text, fontSize: 15, fontWeight: "600" },
  del:    { padding: 2 },
});
