import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, Modal, Pressable, TextInput, StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "./Icon";
import { C } from "../theme/colors";

export type RangeKey = "7d" | "30d" | "1y" | "all" | "custom";

export interface DateRange {
  startMs: number | null; // inclusive lower bound, null = no bound
  endMs: number | null;   // inclusive upper bound, null = no bound
  label: string;
}

const DAY = 86400000;

const OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7d",     label: "Last 7 days" },
  { key: "30d",    label: "Last 30 days" },
  { key: "1y",     label: "Last year" },
  { key: "all",    label: "All time" },
  { key: "custom", label: "Custom range" },
];

const startOfDay = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const endOfDay   = (ms: number) => { const d = new Date(ms); d.setHours(23, 59, 59, 999); return d.getTime(); };
const fmt = (ms: number) => new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function computeRange(key: RangeKey, fromMs?: number | null, toMs?: number | null): DateRange {
  const now = Date.now();
  switch (key) {
    case "7d":  return { startMs: startOfDay(now - 6 * DAY),   endMs: endOfDay(now), label: "Last 7 days" };
    case "30d": return { startMs: startOfDay(now - 29 * DAY),  endMs: endOfDay(now), label: "Last 30 days" };
    case "1y":  return { startMs: startOfDay(now - 364 * DAY), endMs: endOfDay(now), label: "Last year" };
    case "all": return { startMs: null, endMs: null, label: "All time" };
    case "custom":
      if (fromMs != null && toMs != null)
        return { startMs: startOfDay(fromMs), endMs: endOfDay(toMs), label: `${fmt(fromMs)} – ${fmt(toMs)}` };
      return { startMs: null, endMs: null, label: "Custom range" };
  }
}

function parseDate(text: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text.trim())) return null;
  const d = new Date(text.trim() + "T00:00:00");
  return isNaN(d.getTime()) ? null : d.getTime();
}

interface Props {
  rangeKey: RangeKey;
  label: string;
  onChange: (key: RangeKey, range: DateRange) => void;
}

export default function DateRangePicker({ rangeKey, label, onChange }: Props) {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen]   = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [fromText, setFromText]   = useState("");
  const [toText, setToText]       = useState("");
  const [error, setError]         = useState<string | null>(null);

  function select(key: RangeKey) {
    setMenuOpen(false);
    if (key === "custom") {
      setError(null);
      setCustomOpen(true);
      return;
    }
    onChange(key, computeRange(key));
  }

  function applyCustom() {
    const from = parseDate(fromText);
    const to   = parseDate(toText);
    if (from == null || to == null) { setError("Use format YYYY-MM-DD"); return; }
    if (from > to) { setError("From date must be before To date"); return; }
    setCustomOpen(false);
    onChange("custom", computeRange("custom", from, to));
  }

  return (
    <>
      <TouchableOpacity style={s.trigger} onPress={() => setMenuOpen(true)} activeOpacity={0.8}>
        <Ionicons name="calendar-outline" size={14} color={C.green} />
        <Text style={s.triggerText} numberOfLines={1}>{label}</Text>
        <Ionicons name="chevron-down" size={14} color={C.textMid} />
      </TouchableOpacity>

      {/* Dropdown menu */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setMenuOpen(false)}>
          <View style={[s.menu, { top: insets.top + 52 }]}>
            {OPTIONS.map((o, i) => {
              const active = o.key === rangeKey;
              return (
                <TouchableOpacity
                  key={o.key}
                  style={[s.menuItem, i > 0 && s.menuDivider]}
                  onPress={() => select(o.key)}
                >
                  <Text style={[s.menuText, active && { color: C.green, fontWeight: "700" }]}>{o.label}</Text>
                  {active && <Ionicons name="checkmark" size={16} color={C.green} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* Custom range modal */}
      <Modal visible={customOpen} transparent animationType="fade" onRequestClose={() => setCustomOpen(false)}>
        <Pressable style={s.centerBackdrop} onPress={() => setCustomOpen(false)}>
          <Pressable style={s.customCard} onPress={() => {}}>
            <Text style={s.customTitle}>Custom range</Text>

            <Text style={s.customLabel}>From</Text>
            <TextInput
              style={s.customInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.textDim}
              value={fromText}
              onChangeText={setFromText}
              autoCapitalize="none"
              keyboardType={undefined}
            />

            <Text style={s.customLabel}>To</Text>
            <TextInput
              style={s.customInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.textDim}
              value={toText}
              onChangeText={setToText}
              autoCapitalize="none"
            />

            {error && <Text style={s.error}>{error}</Text>}

            <View style={s.customActions}>
              <TouchableOpacity style={[s.customBtn, s.cancelBtn]} onPress={() => setCustomOpen(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.customBtn, s.applyBtn]} onPress={applyCustom}>
                <Text style={s.applyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger:        { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, maxWidth: 200 },
  triggerText:    { color: C.text, fontSize: 13, fontWeight: "600", flexShrink: 1 },

  backdrop:       { flex: 1 },
  menu:           { position: "absolute", right: 16, backgroundColor: C.bg2, borderRadius: 14, borderWidth: 1, borderColor: C.border2, paddingVertical: 4, minWidth: 180, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 12 },
  menuItem:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13 },
  menuDivider:    { borderTopWidth: 1, borderTopColor: C.border },
  menuText:       { color: C.text, fontSize: 14 },

  centerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  customCard:     { width: "100%", maxWidth: 360, backgroundColor: C.bg2, borderRadius: 18, borderWidth: 1, borderColor: C.border2, padding: 20 },
  customTitle:    { color: C.text, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  customLabel:    { color: C.textMid, fontSize: 13, fontWeight: "500", marginBottom: 6, marginTop: 10 },
  customInput:    { backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border },
  error:          { color: C.red, fontSize: 13, marginTop: 12 },
  customActions:  { flexDirection: "row", gap: 10, marginTop: 20 },
  customBtn:      { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  cancelBtn:      { backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  cancelText:     { color: C.textMid, fontWeight: "600", fontSize: 15 },
  applyBtn:       { backgroundColor: C.green },
  applyText:      { color: C.bg, fontWeight: "700", fontSize: 15 },
});
