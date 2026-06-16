import React, { useState } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Switch,
} from "react-native";
import { Ionicons } from "./Icon";
import type { Category, SplitMethod } from "../lib/types";
import { CATEGORIES, CATEGORY_META } from "../lib/types";
import { resolveSplits, validateSplits } from "../lib/splitwise";
import { useStore } from "../store/StoreContext";
import { uid, todayISO } from "../lib/utils";
import { C } from "../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  defaultGroupId?: string;
}

export default function AddExpenseModal({ visible, onClose, defaultGroupId }: Props) {
  const { data, dispatch, meId } = useStore();

  const [description, setDescription] = useState("");
  const [amount,      setAmount]      = useState("");
  const [category,   setCategory]    = useState<Category>("Others");
  const [isGroup,    setIsGroup]     = useState(!!defaultGroupId);
  const [groupId,    setGroupId]     = useState(defaultGroupId ?? "");
  const [paidBy,     setPaidBy]      = useState(meId);
  const [method,     setMethod]      = useState<SplitMethod>("equal");
  const [participants, setParticipants] = useState<string[]>([meId]);
  const [exactValues, setExactValues] = useState<Record<string, string>>({});
  const [pctValues,   setPctValues]   = useState<Record<string, string>>({});
  const [error,       setError]       = useState<string | null>(null);

  const selectedGroup = data.groups.find((g) => g.id === groupId);

  function reset() {
    setDescription(""); setAmount(""); setCategory("Others");
    setIsGroup(!!defaultGroupId); setGroupId(defaultGroupId ?? "");
    setPaidBy(meId); setMethod("equal"); setParticipants([meId]);
    setExactValues({}); setPctValues({}); setError(null);
  }

  function handleClose() { reset(); onClose(); }

  function toggleParticipant(id: string) {
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submit() {
    setError(null);
    const amt = parseFloat(amount);
    if (!description.trim()) { setError("Description required"); return; }
    if (isNaN(amt) || amt <= 0) { setError("Enter a valid amount"); return; }
    if (isGroup && !groupId) { setError("Select a group"); return; }

    const splitValues = method === "exact"
      ? Object.fromEntries(Object.entries(exactValues).map(([k, v]) => [k, parseFloat(v) || 0]))
      : Object.fromEntries(Object.entries(pctValues).map(([k, v]) => [k, parseFloat(v) || 0]));

    const validationErr = isGroup
      ? validateSplits(method, amt, participants, splitValues)
      : null;

    if (validationErr) { setError(validationErr); return; }

    const splits = isGroup
      ? resolveSplits(method, amt, participants, splitValues)
      : undefined;

    dispatch({
      type: "ADD_EXPENSE",
      expense: {
        id: uid("e"),
        description: description.trim(),
        amount: amt,
        category,
        date: todayISO(),
        type: isGroup ? "group" : "personal",
        groupId: isGroup ? groupId : undefined,
        paidBy: isGroup ? paidBy : undefined,
        splitMethod: isGroup ? method : undefined,
        splits,
      },
    });

    handleClose();
  }

  const groupMembers = selectedGroup
    ? selectedGroup.memberIds.map((id) => data.members.find((m) => m.id === id)).filter(Boolean) as any[]
    : [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.container}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Add expense</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={C.textMid} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.flex} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Description */}
            <Text style={s.label}>Description</Text>
            <TextInput
              style={s.input}
              placeholder="What was this for?"
              placeholderTextColor={C.textDim}
              value={description}
              onChangeText={setDescription}
            />

            {/* Amount */}
            <Text style={s.label}>Amount (₹)</Text>
            <TextInput
              style={s.input}
              placeholder="0.00"
              placeholderTextColor={C.textDim}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            {/* Category */}
            <Text style={s.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips}>
              {CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat];
                const active = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[s.chip, active && { backgroundColor: meta.soft, borderColor: meta.color }]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[s.chipText, active && { color: meta.color }]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Group toggle */}
            <View style={s.toggleRow}>
              <Text style={s.label}>Group expense</Text>
              <Switch
                value={isGroup}
                onValueChange={(v) => { setIsGroup(v); if (!v) { setGroupId(""); } }}
                trackColor={{ false: C.bg3, true: C.green + "66" }}
                thumbColor={isGroup ? C.green : C.textMid}
              />
            </View>

            {isGroup && (
              <>
                {/* Group picker */}
                <Text style={s.label}>Select group</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips}>
                  {data.groups.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={[s.chip, groupId === g.id && s.chipActive]}
                      onPress={() => {
                        setGroupId(g.id);
                        setParticipants(g.memberIds);
                        setPaidBy(meId);
                      }}
                    >
                      <Text style={[s.chipText, groupId === g.id && { color: C.green }]}>{g.emoji} {g.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {selectedGroup && (
                  <>
                    {/* Paid by */}
                    <Text style={s.label}>Paid by</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips}>
                      {groupMembers.map((m) => (
                        <TouchableOpacity
                          key={m.id}
                          style={[s.chip, paidBy === m.id && s.chipActive]}
                          onPress={() => setPaidBy(m.id)}
                        >
                          <Text style={[s.chipText, paidBy === m.id && { color: C.green }]}>{m.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Split method */}
                    <Text style={s.label}>Split method</Text>
                    <View style={s.methodRow}>
                      {(["equal", "exact", "percentage"] as SplitMethod[]).map((m) => (
                        <TouchableOpacity
                          key={m}
                          style={[s.methodBtn, method === m && s.methodBtnActive]}
                          onPress={() => setMethod(m)}
                        >
                          <Text style={[s.methodText, method === m && { color: C.green }]}>{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Participants */}
                    <Text style={s.label}>Participants</Text>
                    {groupMembers.map((m) => (
                      <View key={m.id} style={s.participantRow}>
                        <TouchableOpacity
                          style={s.participantToggle}
                          onPress={() => toggleParticipant(m.id)}
                        >
                          <View style={[s.check, participants.includes(m.id) && { backgroundColor: C.green, borderColor: C.green }]}>
                            {participants.includes(m.id) && <Ionicons name="checkmark" size={12} color={C.bg} />}
                          </View>
                          <Text style={s.participantName}>{m.name}</Text>
                        </TouchableOpacity>

                        {method !== "equal" && participants.includes(m.id) && (
                          <TextInput
                            style={s.splitInput}
                            keyboardType="decimal-pad"
                            placeholder={method === "exact" ? "₹" : "%"}
                            placeholderTextColor={C.textDim}
                            value={method === "exact" ? exactValues[m.id] ?? "" : pctValues[m.id] ?? ""}
                            onChangeText={(v) =>
                              method === "exact"
                                ? setExactValues((prev) => ({ ...prev, [m.id]: v }))
                                : setPctValues((prev) => ({ ...prev, [m.id]: v }))
                            }
                          />
                        )}
                      </View>
                    ))}
                  </>
                )}
              </>
            )}

            {error && <Text style={s.error}>{error}</Text>}
          </ScrollView>

          {/* Submit */}
          <TouchableOpacity style={s.submitBtn} onPress={submit} activeOpacity={0.8}>
            <Text style={s.submitText}>Add expense</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  flex:            { flex: 1 },
  container:       { flex: 1, backgroundColor: C.bg, padding: 20 },
  header:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title:           { color: C.text, fontSize: 20, fontWeight: "700" },
  label:           { color: C.textMid, fontSize: 13, fontWeight: "500", marginBottom: 8, marginTop: 16 },
  input:           { backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border },
  chips:           { flexDirection: "row" },
  chip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, marginRight: 8, backgroundColor: C.card },
  chipActive:      { borderColor: C.green, backgroundColor: C.green + "1a" },
  chipText:        { color: C.textMid, fontSize: 13, fontWeight: "500" },
  toggleRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16 },
  methodRow:       { flexDirection: "row", gap: 8 },
  methodBtn:       { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: "center", backgroundColor: C.card },
  methodBtnActive: { borderColor: C.green, backgroundColor: C.green + "1a" },
  methodText:      { color: C.textMid, fontSize: 13, fontWeight: "500", textTransform: "capitalize" },
  participantRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  participantToggle: { flexDirection: "row", alignItems: "center", gap: 10 },
  check:           { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  participantName: { color: C.text, fontSize: 15 },
  splitInput:      { backgroundColor: C.card, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: C.text, fontSize: 14, width: 90, borderWidth: 1, borderColor: C.border, textAlign: "right" },
  error:           { color: C.red, fontSize: 13, marginTop: 12, textAlign: "center" },
  submitBtn:       { backgroundColor: C.green, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 16 },
  submitText:      { color: C.bg, fontWeight: "700", fontSize: 16 },
});
