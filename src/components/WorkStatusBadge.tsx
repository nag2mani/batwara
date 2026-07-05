import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "./Icon";
import type { WorkStatus } from "../lib/types";
import { C } from "../theme/colors";

const META: Record<WorkStatus, { label: string; color: string; icon: string }> = {
  verified: { label: "Verified", color: C.green, icon: "checkmark-circle" },
  pending:  { label: "Pending",  color: C.amber, icon: "time" },
  rejected: { label: "Rejected", color: C.red,   icon: "close-circle" },
};

export default function WorkStatusBadge({ status, small }: { status: WorkStatus; small?: boolean }) {
  const m = META[status];
  return (
    <View style={[s.badge, { backgroundColor: m.color + "1a" }, small && s.small]}>
      <Ionicons name={m.icon as any} size={small ? 11 : 13} color={m.color} />
      <Text style={[s.text, { color: m.color }, small && s.textSmall]}>{m.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge:     { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  small:     { paddingHorizontal: 8, paddingVertical: 3, gap: 3 },
  text:      { fontSize: 12, fontWeight: "700" },
  textSmall: { fontSize: 11 },
});
