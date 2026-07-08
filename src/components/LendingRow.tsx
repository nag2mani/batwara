import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Lending } from "../lib/types";
import { formatDate, formatMoney } from "../lib/utils";
import { useStore } from "../store/StoreContext";
import { lendingPerspective } from "../lib/lending";
import { Ionicons } from "./Icon";
import LendingDetailModal from "./LendingDetailModal";
import { C } from "../theme/colors";

/** A single loan — shown as "lent" or "borrowed" depending on the viewer. Tap to open details. */
export default function LendingRow({ lending }: { lending: Lending }) {
  const { memberById, meId } = useStore();
  const [detailVisible, setDetailVisible] = useState(false);

  const { otherName: other, theyOweMe } = lendingPerspective(lending, meId, memberById);
  const settled = !!lending.settledAt;

  const title = theyOweMe ? `You lent ${other}` : `You borrowed from ${other}`;
  const amountColor = settled ? C.textMid : theyOweMe ? C.green : C.red;

  return (
    <>
      <TouchableOpacity style={s.row} onPress={() => setDetailVisible(true)} activeOpacity={0.6}>
        <View style={[s.iconWrap, { backgroundColor: (theyOweMe ? C.green : C.red) + "1a" }]}>
          <Ionicons name={theyOweMe ? "arrow-up" : "arrow-down"} size={16} color={theyOweMe ? C.green : C.red} />
        </View>

        <View style={s.info}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          <Text style={s.meta} numberOfLines={1}>
            {formatDate(lending.date)}
            {lending.description ? `  ·  ${lending.description}` : ""}
            {settled ? "  ·  ✓ Settled" : ""}
          </Text>
        </View>

        <Text style={[s.amount, { color: amountColor }]}>{formatMoney(lending.amount)}</Text>
        <Ionicons name="chevron-forward" size={16} color={C.textDim} />
      </TouchableOpacity>

      <LendingDetailModal lending={lending} visible={detailVisible} onClose={() => setDetailVisible(false)} />
    </>
  );
}

const s = StyleSheet.create({
  row:      { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  info:     { flex: 1, gap: 3 },
  title:    { color: C.text, fontSize: 15, fontWeight: "500" },
  meta:     { color: C.textMid, fontSize: 12 },
  amount:   { fontSize: 15, fontWeight: "600" },
});
