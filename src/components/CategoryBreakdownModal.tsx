import React from "react";
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "./Icon";
import type { Category } from "../lib/types";
import CategoryIcon from "./CategoryIcon";
import { formatMoney } from "../lib/utils";
import { C } from "../theme/colors";

export interface CategoryRow {
  name: string;
  value: number;
  color: string;
  pct: number;   // 0–100
}

interface Props {
  visible: boolean;
  onClose: () => void;
  rows: CategoryRow[];        // expected pre-sorted, highest first
  total: number;
  rangeLabel: string;
}

export default function CategoryBreakdownModal({ visible, onClose, rows, total, rangeLabel }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.container} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Spending by category</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={C.textMid} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Hero total */}
          <View style={s.hero}>
            <Text style={s.total}>{formatMoney(total, true)}</Text>
            <Text style={s.sub}>{rangeLabel.toLowerCase()} · {rows.length} categor{rows.length === 1 ? "y" : "ies"}</Text>
          </View>

          {/* Breakdown rows */}
          <View style={s.card}>
            {rows.map((r, i) => (
              <View key={r.name} style={[s.row, i > 0 && s.divider]}>
                <View style={s.rowTop}>
                  <View style={s.rowLeft}>
                    <CategoryIcon category={r.name as Category} size={18} />
                    <Text style={s.name}>{r.name}</Text>
                  </View>
                  <View style={s.rowRight}>
                    <Text style={s.value}>{formatMoney(r.value, true)}</Text>
                    <Text style={[s.pct, { color: r.color }]}>{r.pct.toFixed(1)}%</Text>
                  </View>
                </View>
                {/* Proportional bar */}
                <View style={s.track}>
                  <View style={[s.fill, { width: `${Math.max(2, r.pct)}%`, backgroundColor: r.color }]} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20 },
  header:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16 },
  title:     { color: C.text, fontSize: 20, fontWeight: "700" },
  scroll:    { paddingBottom: 24 },
  hero:      { alignItems: "center", gap: 4, paddingVertical: 12 },
  total:     { color: C.text, fontSize: 34, fontWeight: "700", letterSpacing: -0.5 },
  sub:       { color: C.textMid, fontSize: 13 },
  card:      { backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: C.border, marginTop: 8 },
  row:       { paddingVertical: 14, gap: 10 },
  divider:   { borderTopWidth: 1, borderTopColor: C.border },
  rowTop:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLeft:   { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  name:      { color: C.text, fontSize: 15, fontWeight: "500" },
  rowRight:  { alignItems: "flex-end", gap: 2 },
  value:     { color: C.text, fontSize: 15, fontWeight: "600" },
  pct:       { fontSize: 12, fontWeight: "700" },
  track:     { height: 6, borderRadius: 3, backgroundColor: C.bg3, overflow: "hidden" },
  fill:      { height: 6, borderRadius: 3 },
});
