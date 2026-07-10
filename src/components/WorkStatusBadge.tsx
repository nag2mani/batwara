import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "./Icon";
import type { WorkStatus } from "../lib/types";
import { C } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeContext";

// Label/icon are static; color is read at render time so it follows the active theme.
const META: Record<WorkStatus, { label: string; colorKey: "green" | "amber" | "red"; icon: string }> = {
  verified: { label: "Verified", colorKey: "green", icon: "checkmark-circle" },
  pending:  { label: "Pending",  colorKey: "amber", icon: "time" },
  rejected: { label: "Rejected", colorKey: "red",   icon: "close-circle" },
};

export default function WorkStatusBadge({ status, small }: { status: WorkStatus; small?: boolean }) {
  const s = useThemedStyles(makeStyles);
  const meta = META[status];
  const m = { ...meta, color: C[meta.colorKey] };
  return (
    <View style={[s.badge, { backgroundColor: m.color + "1a" }, small && s.small]}>
      <Ionicons name={m.icon as any} size={small ? 11 : 13} color={m.color} />
      <Text style={[s.text, { color: m.color }, small && s.textSmall]}>{m.label}</Text>
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  badge:     { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  small:     { paddingHorizontal: 8, paddingVertical: 3, gap: 3 },
  text:      { fontSize: 12, fontWeight: "700" },
  textSmall: { fontSize: 11 },
});
