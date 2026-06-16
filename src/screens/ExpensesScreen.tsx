import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "../components/Icon";
import type { Category } from "../lib/types";
import { CATEGORIES, CATEGORY_META } from "../lib/types";
import { useStore } from "../store/StoreContext";
import ExpenseRow from "../components/ExpenseRow";
import AddExpenseModal from "../components/AddExpenseModal";
import AddFab from "../components/AddFab";
import { C } from "../theme/colors";

type TypeFilter = "all" | "personal" | "group";

export default function ExpensesScreen() {
  const { data } = useStore();
  const [addVisible,      setAddVisible]      = useState(false);
  const [typeFilter,      setTypeFilter]      = useState<TypeFilter>("all");
  const [categoryFilters, setCategoryFilters] = useState<Set<Category>>(new Set());

  function toggleCategory(cat: Category) {
    setCategoryFilters((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  const filtered = data.expenses.filter((e) => {
    if (typeFilter !== "all" && e.type !== typeFilter) return false;
    if (categoryFilters.size > 0 && !categoryFilters.has(e.category)) return false;
    return true;
  });

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Expenses</Text>
      </View>

      {/* Filters */}
      <View style={s.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {/* Type chips */}
          {(["all", "personal", "group"] as TypeFilter[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.chip, typeFilter === t && s.chipActive]}
              onPress={() => setTypeFilter(t)}
            >
              <Text style={[s.chipText, typeFilter === t && { color: C.green }]}>{t}</Text>
            </TouchableOpacity>
          ))}

          <View style={s.dividerV} />

          {/* Category chips */}
          {CATEGORIES.map((cat) => {
            const active = categoryFilters.has(cat);
            const meta   = CATEGORY_META[cat];
            return (
              <TouchableOpacity
                key={cat}
                style={[s.chip, active && { borderColor: meta.color, backgroundColor: meta.soft }]}
                onPress={() => toggleCategory(cat)}
              >
                <Text style={[s.chipText, active && { color: meta.color }]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {filtered.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="receipt-outline" size={48} color={C.textDim} />
          <Text style={s.emptyText}>No expenses</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ExpenseRow expense={item} />}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <AddFab onPress={() => setAddVisible(true)} />

      <AddExpenseModal visible={addVisible} onClose={() => setAddVisible(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: C.bg },
  header:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title:    { color: C.text, fontSize: 24, fontWeight: "700" },
  filters:  { paddingBottom: 8 },
  filterRow:{ paddingHorizontal: 16, gap: 8, flexDirection: "row", alignItems: "center" },
  chip:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  chipActive:{ borderColor: C.green, backgroundColor: C.green + "1a" },
  chipText: { color: C.textMid, fontSize: 13, fontWeight: "500", textTransform: "capitalize" },
  dividerV: { width: 1, height: 24, backgroundColor: C.border, marginHorizontal: 4 },
  list:     { paddingHorizontal: 16, paddingBottom: 96 },
  sep:      { height: 1, backgroundColor: C.border },
  empty:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText:{ color: C.textMid, fontSize: 16 },
});
