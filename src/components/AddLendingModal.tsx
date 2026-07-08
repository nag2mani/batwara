import React, { useEffect, useState } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Ionicons } from "./Icon";
import type { LendingDirection } from "../lib/types";
import { useStore } from "../store/StoreContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { uid, todayISO } from "../lib/utils";
import { C } from "../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface PersonResult {
  id: string;
  name: string;
  email?: string;
}

export default function AddLendingModal({ visible, onClose }: Props) {
  const { data, dispatch, meId } = useStore();

  const [direction,   setDirection]   = useState<LendingDirection>("lent");
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState<PersonResult[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [selected,    setSelected]    = useState<PersonResult | null>(null);
  const [manualEmail, setManualEmail] = useState("");
  const [amount,      setAmount]      = useState("");
  const [description, setDescription] = useState("");
  const [error,       setError]       = useState<string | null>(null);

  const lent = direction === "lent";

  function reset() {
    setDirection("lent");
    setQuery(""); setResults([]); setSearching(false); setSelected(null);
    setManualEmail(""); setAmount(""); setDescription(""); setError(null);
  }

  function handleClose() { reset(); onClose(); }

  // Debounced search of onboarded users by name or email.
  useEffect(() => {
    if (selected) return;                        // already picked someone
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }

    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      let found: PersonResult[] = [];
      if (isSupabaseConfigured && supabase) {
        // Strip characters that would break the PostgREST or() filter grammar.
        const safe = q.replace(/[,()*]/g, " ").trim();
        const { data: rows } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .or(`display_name.ilike.%${safe}%,email.ilike.%${safe}%`)
          .limit(10);
        found = (rows ?? [])
          .filter((r: any) => r.id !== meId)
          .map((r: any) => ({ id: r.id, name: r.display_name, email: r.email ?? undefined }));
      } else {
        // Local mode — match against known members.
        found = data.members
          .filter((m) => m.id !== meId && m.name.toLowerCase().includes(q.toLowerCase()))
          .map((m) => ({ id: m.id, name: m.name }));
      }
      if (!cancelled) { setResults(found); setSearching(false); }
    }, 300);

    return () => { cancelled = true; clearTimeout(t); };
  }, [query, selected, meId, data.members]);

  function pick(p: PersonResult) {
    setSelected(p);
    setQuery(p.name);
    setResults([]);
  }

  function clearSelection() {
    setSelected(null);
    setQuery("");
    setManualEmail("");
  }

  function submit() {
    setError(null);
    const amt = parseFloat(amount);
    const name = selected ? selected.name : query.trim();
    if (!name) { setError(lent ? "Enter who you lent to" : "Enter who you borrowed from"); return; }
    if (isNaN(amt) || amt <= 0) { setError("Enter a valid amount"); return; }

    const email = selected ? selected.email : (manualEmail.trim() || undefined);

    dispatch({
      type: "ADD_LENDING",
      lending: {
        id: uid("l"),
        createdBy: meId,
        direction,
        counterpartyId: selected?.id,
        counterpartyName: name,
        counterpartyEmail: email,
        amount: amt,
        description: description.trim() || undefined,
        date: todayISO(),
        createdAt: todayISO(),
      },
    });

    handleClose();
  }

  // Show the "not found → add manually" block when the user typed something,
  // hasn't selected anyone, and search isn't mid-flight with results.
  const typedName = query.trim();
  const showManual = !selected && typedName.length >= 2 && !searching && results.length === 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.container}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Add loan</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={C.textMid} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.flex} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Direction */}
            <View style={s.toggle}>
              {(["lent", "borrowed"] as LendingDirection[]).map((d) => {
                const active = direction === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[s.toggleBtn, active && s.toggleBtnActive]}
                    onPress={() => setDirection(d)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.toggleText, active && { color: C.green }]}>
                      {d === "lent" ? "I lent" : "I borrowed"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Who */}
            <Text style={s.label}>{lent ? "Lent to" : "Borrowed from"}</Text>

            {selected ? (
              <View style={s.selectedRow}>
                <View style={s.selectedInfo}>
                  <Ionicons name="checkmark-circle" size={18} color={C.green} />
                  <View>
                    <Text style={s.selectedName}>{selected.name}</Text>
                    {selected.email ? <Text style={s.selectedEmail}>{selected.email}</Text> : null}
                  </View>
                </View>
                <TouchableOpacity onPress={clearSelection} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={20} color={C.textMid} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={s.searchWrap}>
                  <Ionicons name="search" size={16} color={C.textDim} />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Search name or email"
                    placeholderTextColor={C.textDim}
                    value={query}
                    onChangeText={setQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searching && <ActivityIndicator size="small" color={C.textDim} />}
                </View>

                {/* Results */}
                {results.map((r) => (
                  <TouchableOpacity key={r.id} style={s.resultRow} onPress={() => pick(r)}>
                    <Ionicons name="person-circle-outline" size={22} color={C.green} />
                    <View style={s.flex}>
                      <Text style={s.resultName}>{r.name}</Text>
                      {r.email ? <Text style={s.resultEmail}>{r.email}</Text> : null}
                    </View>
                    <Ionicons name="add-circle-outline" size={20} color={C.textMid} />
                  </TouchableOpacity>
                ))}

                {/* Not onboarded → add by name + optional email */}
                {showManual && (
                  <View style={s.manualBox}>
                    <Text style={s.manualTitle}>
                      Not found. Add “{typedName}” manually
                    </Text>
                    <Text style={s.manualHint}>
                      Add their email (optional) — when they sign up with it, this loan
                      will show on their account too.
                    </Text>
                    <TextInput
                      style={s.input}
                      placeholder="Email (optional)"
                      placeholderTextColor={C.textDim}
                      value={manualEmail}
                      onChangeText={setManualEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                )}
              </>
            )}

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

            {/* Note */}
            <Text style={s.label}>Note (optional)</Text>
            <TextInput
              style={s.input}
              placeholder="What was it for?"
              placeholderTextColor={C.textDim}
              value={description}
              onChangeText={setDescription}
            />

            {error && <Text style={s.error}>{error}</Text>}
          </ScrollView>

          {/* Submit */}
          <TouchableOpacity style={s.submitBtn} onPress={submit} activeOpacity={0.8}>
            <Text style={s.submitText}>Log loan</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  flex:         { flex: 1 },
  container:    { flex: 1, backgroundColor: C.bg, padding: 20 },
  header:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title:        { color: C.text, fontSize: 20, fontWeight: "700" },
  label:        { color: C.textMid, fontSize: 13, fontWeight: "500", marginBottom: 8, marginTop: 16 },
  toggle:       { flexDirection: "row", gap: 8, marginTop: 4 },
  toggleBtn:    { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: "center", backgroundColor: C.card },
  toggleBtnActive: { borderColor: C.green, backgroundColor: C.green + "1a" },
  toggleText:   { color: C.textMid, fontSize: 14, fontWeight: "600" },
  input:        { backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border },
  searchWrap:   { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border },
  searchInput:  { flex: 1, paddingVertical: 14, color: C.text, fontSize: 15 },
  resultRow:    { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  resultName:   { color: C.text, fontSize: 15, fontWeight: "500" },
  resultEmail:  { color: C.textDim, fontSize: 12 },
  selectedRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.green + "1a", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.green + "44" },
  selectedInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  selectedName: { color: C.text, fontSize: 15, fontWeight: "600" },
  selectedEmail:{ color: C.textMid, fontSize: 12 },
  manualBox:    { backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, marginTop: 12, gap: 8 },
  manualTitle:  { color: C.text, fontSize: 14, fontWeight: "600" },
  manualHint:   { color: C.textDim, fontSize: 12, lineHeight: 17 },
  error:        { color: C.red, fontSize: 13, marginTop: 12, textAlign: "center" },
  submitBtn:    { backgroundColor: C.green, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 16 },
  submitText:   { color: C.bg, fontWeight: "700", fontSize: 16 },
});
