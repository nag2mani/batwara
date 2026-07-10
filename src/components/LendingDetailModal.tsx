import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import type { Lending } from "../lib/types";
import { formatDateLong, formatMoney, todayISO } from "../lib/utils";
import { useStore } from "../store/StoreContext";
import { lendingPerspective } from "../lib/lending";
import { Ionicons } from "./Icon";
import { C } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeContext";

interface Props {
  lending: Lending;
  visible: boolean;
  onClose: () => void;
}

export default function LendingDetailModal({ lending, visible, onClose }: Props) {
  const s = useThemedStyles(makeStyles);
  const { dispatch, memberById, meId } = useStore();

  const { otherName: other, theyOweMe, iAmCreator } = lendingPerspective(lending, meId, memberById);
  const settled = !!lending.settledAt;

  const title = theyOweMe ? `You lent ${other}` : `You borrowed from ${other}`;
  const accent = theyOweMe ? C.green : C.red;

  function toggleSettled() {
    dispatch({
      type: "SET_LENDING_SETTLED",
      id: lending.id,
      settledAt: settled ? null : todayISO(),
    });
    onClose();
  }

  function confirmDelete() {
    Alert.alert("Delete loan", `Delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => { dispatch({ type: "DELETE_LENDING", id: lending.id }); onClose(); },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Loan details</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={C.textMid} />
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View style={s.amountBlock}>
          <View style={[s.iconWrap, { backgroundColor: accent + "1a" }]}>
            <Ionicons name={theyOweMe ? "arrow-up" : "arrow-down"} size={22} color={accent} />
          </View>
          <Text style={[s.amount, { color: accent }]}>{formatMoney(lending.amount)}</Text>
          <Text style={s.title}>{title}</Text>
          <View style={[s.statusPill, { backgroundColor: (settled ? C.textMid : C.amber) + "1a" }]}>
            <Text style={[s.statusText, { color: settled ? C.textMid : C.amber }]}>
              {settled ? "Settled" : "Outstanding"}
            </Text>
          </View>
        </View>

        {/* Meta */}
        <View style={s.metaCard}>
          <Row label="Date" value={formatDateLong(lending.date)} />
          {lending.description ? <Row label="Note" value={lending.description} /> : null}
          {iAmCreator && lending.counterpartyEmail ? <Row label="Email" value={lending.counterpartyEmail} /> : null}
          {iAmCreator ? (
            <Row label="Linked" value={lending.counterpartyId ? "Yes — shows on their account" : "No — name only"} />
          ) : null}
          {settled ? <Row label="Settled on" value={formatDateLong(lending.settledAt!)} /> : null}
        </View>

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.settleBtn, settled && s.undoBtn]}
            onPress={toggleSettled}
            activeOpacity={0.85}
          >
            <Ionicons
              name={settled ? "arrow-undo" : "checkmark-circle"}
              size={18}
              color={settled ? C.text : C.bg}
            />
            <Text style={[s.settleText, settled && { color: C.text }]}>
              {settled ? "Mark as outstanding" : "Mark settled"}
            </Text>
          </TouchableOpacity>

          {iAmCreator && (
            <TouchableOpacity style={s.deleteBtn} onPress={confirmDelete} activeOpacity={0.85}>
              <Ionicons name="trash-outline" size={18} color={C.red} />
              <Text style={s.deleteText}>Delete loan</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.metaRow}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue}>{value}</Text>
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg, padding: 20 },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  headerTitle: { color: C.text, fontSize: 20, fontWeight: "700" },
  amountBlock: { alignItems: "center", gap: 8, marginBottom: 24 },
  iconWrap:    { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  amount:      { fontSize: 34, fontWeight: "700", letterSpacing: -0.5 },
  title:       { color: C.text, fontSize: 16, fontWeight: "500" },
  statusPill:  { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 4 },
  statusText:  { fontSize: 12, fontWeight: "700" },
  metaCard:    { backgroundColor: C.card, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: C.border },
  metaRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12 },
  metaLabel:   { color: C.textMid, fontSize: 14 },
  metaValue:   { color: C.text, fontSize: 14, fontWeight: "500", flexShrink: 1, textAlign: "right", marginLeft: 12 },
  actions:     { gap: 12, marginTop: 24 },
  settleBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.green, borderRadius: 14, paddingVertical: 15 },
  undoBtn:     { backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  settleText:  { color: C.bg, fontWeight: "700", fontSize: 15 },
  deleteBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 15, borderWidth: 1, borderColor: C.red + "44" },
  deleteText:  { color: C.red, fontWeight: "600", fontSize: 15 },
});
