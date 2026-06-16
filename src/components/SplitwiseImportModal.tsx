import React, { useState } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "./Icon";
import { useStore } from "../store/StoreContext";
import { useAuth } from "../auth/AuthContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { MEMBER_COLORS, C } from "../theme/colors";
import {
  parseSplitwiseCSV, buildImportData, nameFromIdentifier,
  type MemberCol, type ParsedImport,
} from "../lib/splitwiseImport";
import type { Member } from "../lib/types";
import Avatar from "./Avatar";

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Step = "pick" | "resolving" | "review" | "importing";

const EMOJIS = ["🏠", "🛒", "🍱", "🏖️", "✈️", "🎉", "🚗", "💼"];

export default function SplitwiseImportModal({ visible, onClose }: Props) {
  const { data, dispatch, meId, memberById } = useStore();
  const { user: authUser } = useAuth();

  const [step, setStep]               = useState<Step>("pick");
  const [parsed, setParsed]           = useState<ParsedImport | null>(null);
  const [resolved, setResolved]       = useState<Member[]>([]);
  const [labels, setLabels]           = useState<string[]>([]);
  const [youIdx, setYouIdx]           = useState<number | null>(null);
  const [groupName, setGroupName]     = useState("Splitwise Import");
  const [groupEmoji, setGroupEmoji]   = useState("🏠");
  const [error, setError]             = useState<string | null>(null);

  function reset() {
    setStep("pick"); setParsed(null); setResolved([]); setLabels([]); setYouIdx(null);
    setGroupName("Splitwise Import"); setGroupEmoji("🏠"); setError(null);
  }

  function handleClose() { reset(); onClose(); }

  // ─── Resolve a single CSV member column to a Member object ──────────────
  async function resolveCol(col: MemberCol, idx: number): Promise<{ member: Member; label: string }> {
    const name = nameFromIdentifier(col.identifier);
    const firstName = name.split(" ")[0].toLowerCase();

    // 1. Exact email match with current user
    if (col.isEmail && authUser?.email &&
        col.identifier.toLowerCase() === authUser.email.toLowerCase()) {
      const me = memberById.get(meId);
      return {
        member: me ?? { id: meId, name: authUser.displayName ?? "Me", color: MEMBER_COLORS[0] },
        label: "You",
      };
    }

    // 2. Supabase profile lookup by email
    if (col.isEmail && isSupabaseConfigured && supabase) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name, color")
        .eq("email", col.identifier.toLowerCase())
        .maybeSingle();
      if (profile) {
        return {
          member: { id: profile.id, name: profile.display_name, color: profile.color ?? MEMBER_COLORS[idx % MEMBER_COLORS.length] },
          label: `Found: ${profile.display_name}`,
        };
      }
    }

    // 3. First-name match against existing members in local store
    const existingMatch = [...memberById.values()].find(m => {
      const mFirst = m.name.split(" ")[0].toLowerCase();
      return mFirst === firstName && m.id !== meId;
    });
    if (existingMatch) {
      return { member: existingMatch, label: `Matched: ${existingMatch.name}` };
    }

    // 4. Create a new local member
    const color = MEMBER_COLORS[idx % MEMBER_COLORS.length];
    const newId = `sw_${col.identifier.replace(/[^a-zA-Z0-9]/g, "_")}`;
    return {
      member: { id: newId, name, color },
      label: `New: ${name}`,
    };
  }
 
  // ─── Pick + parse CSV file ───────────────────────────────────────────────
  async function pickAndParse() {
    setError(null);
    let result;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/plain", "text/comma-separated-values", "application/vnd.ms-excel", "*/*"],
        copyToCacheDirectory: true,
      });
    } catch {
      setError("Could not open file picker"); return;
    }

    if (result.canceled) return;
    setStep("resolving");

    let text: string;
    try {
      const resp = await fetch(result.assets[0].uri);
      text = await resp.text();
    } catch {
      setError("Failed to read the file"); setStep("pick"); return;
    }

    const parsedResult = parseSplitwiseCSV(text);
    if (!parsedResult || parsedResult.rows.length === 0) {
      setError("No valid expenses found. Make sure this is a Splitwise CSV export.");
      setStep("pick"); return;
    }

    // Auto-name the group from the file name
    const rawName = result.assets[0].name ?? "";
    const derived = rawName.replace(/\.csv$/i, "").replace(/[_-]+/g, " ").trim();
    if (derived) setGroupName(derived);

    // Resolve each member column
    const memberResults = await Promise.all(
      parsedResult.memberCols.map((col, i) => resolveCol(col, i))
    );

    setParsed(parsedResult);
    setResolved(memberResults.map(r => r.member));
    setLabels(memberResults.map(r => r.label));
    // Default "you" to the column auto-matched by email, if any.
    const meDefault = memberResults.findIndex(r => r.label === "You");
    setYouIdx(meDefault >= 0 ? meDefault : null);
    setStep("review");
  }

  // ─── Do the actual import ────────────────────────────────────────────────
  async function doImport() {
    if (!parsed) return;
    setStep("importing");

    const existingIds = new Set(data.members.map(m => m.id));

    // Link the chosen "you" column to the logged-in account (meId) so balances
    // are computed from your perspective. Any other column that was auto-matched
    // to you (but isn't the chosen one) is turned back into a distinct member.
    const meMember: Member = memberById.get(meId) ?? {
      id: meId,
      name: authUser?.displayName ?? "You",
      color: MEMBER_COLORS[0],
    };
    const finalResolved: Member[] = resolved.map((m, i) => {
      if (i === youIdx) return meMember;
      if (m.id === meId) {
        const col = parsed.memberCols[i];
        return {
          id: `sw_${col.identifier.replace(/[^a-zA-Z0-9]/g, "_")}`,
          name: nameFromIdentifier(col.identifier),
          color: MEMBER_COLORS[i % MEMBER_COLORS.length],
        };
      }
      return m;
    });

    const importData = buildImportData(
      parsed, finalResolved, existingIds,
      groupName.trim() || "Splitwise Import",
      groupEmoji,
    );

    dispatch({ type: "ADD_GROUP", group: importData.group, newMembers: importData.newMembers });
    for (const expense of importData.expenses) {
      dispatch({ type: "ADD_EXPENSE", expense });
    }

    handleClose();
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Import from Splitwise</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={C.textMid} />
          </TouchableOpacity>
        </View>

        {/* ── Step: pick ──────────────────────────────────────────────── */}
        {(step === "pick") && (
          <View style={s.centerPane}>
            <View style={s.iconCircle}>
              <Ionicons name="download-outline" size={36} color={C.sky} />
            </View>
            <Text style={s.heading}>Import your group expenses</Text>
            <Text style={s.hint}>
              Export a group from Splitwise (Group → Export as CSV), then pick the file here.
              A new group will be created with all expenses.
            </Text>
            {error && <Text style={s.error}>{error}</Text>}
            <TouchableOpacity style={s.pickBtn} onPress={pickAndParse} activeOpacity={0.8}>
              <Ionicons name="folder-open-outline" size={18} color={C.bg} />
              <Text style={s.pickBtnText}>Browse CSV file</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step: resolving ─────────────────────────────────────────── */}
        {step === "resolving" && (
          <View style={s.centerPane}>
            <ActivityIndicator size="large" color={C.sky} />
            <Text style={s.hint}>Resolving members…</Text>
          </View>
        )}

        {/* ── Step: review ────────────────────────────────────────────── */}
        {step === "review" && parsed && (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>Group emoji</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.emojiRow}>
              {EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[s.emojiBtn, groupEmoji === e && s.emojiBtnActive]}
                  onPress={() => setGroupEmoji(e)}
                >
                  <Text style={s.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.label}>Group name</Text>
            <TextInput
              style={s.input}
              value={groupName}
              onChangeText={setGroupName}
              placeholderTextColor={C.textDim}
              placeholder="Group name"
            />

            <Text style={s.label}>Members ({resolved.length})</Text>
            <View style={s.membersCard}>
              {resolved.map((m, i) => (
                <View key={m.id} style={[s.memberRow, i < resolved.length - 1 && s.memberRowBorder]}>
                  <Avatar name={m.name} color={m.color} size="sm" />
                  <View style={s.memberInfo}>
                    <Text style={s.memberName}>{m.name}</Text>
                    <Text style={s.memberSub}>{parsed.memberCols[i].identifier}</Text>
                  </View>
                  <View style={[s.badge, labelBadgeStyle(labels[i])]}>
                    <Text style={[s.badgeText, labelTextStyle(labels[i])]}>
                      {labels[i]}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={s.label}>Which member are you?</Text>
            <Text style={s.youHint}>Pick your column so balances show from your perspective.</Text>
            <View style={s.youRow}>
              {resolved.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.youChip, youIdx === i && s.youChipActive]}
                  onPress={() => setYouIdx(i)}
                >
                  {youIdx === i && <Ionicons name="checkmark-circle" size={15} color={C.green} />}
                  <Text style={[s.youChipText, youIdx === i && { color: C.green }]}>
                    {nameFromIdentifier(parsed.memberCols[i].identifier)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.summaryCard}>
              <Ionicons name="receipt-outline" size={20} color={C.sky} />
              <Text style={s.summaryText}>
                <Text style={{ color: C.text, fontWeight: "700" }}>{parsed.rows.length}</Text>
                {" "}expenses will be imported ({parsed.currency})
              </Text>
            </View>

            <TouchableOpacity style={s.importBtn} onPress={doImport} activeOpacity={0.85}>
              <Ionicons name="download-outline" size={18} color={C.bg} />
              <Text style={s.importBtnText}>
                Import {parsed.rows.length} expenses
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ── Step: importing ─────────────────────────────────────────── */}
        {step === "importing" && (
          <View style={s.centerPane}>
            <ActivityIndicator size="large" color={C.sky} />
            <Text style={s.hint}>Importing expenses…</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

// Badge colour helpers
function labelBadgeStyle(label: string) {
  if (label === "You") return { backgroundColor: C.green + "22" };
  if (label.startsWith("Found")) return { backgroundColor: C.sky + "22" };
  if (label.startsWith("Matched")) return { backgroundColor: C.purple + "22" };
  return { backgroundColor: C.amber + "22" };
}
function labelTextStyle(label: string) {
  if (label === "You") return { color: C.green };
  if (label.startsWith("Found")) return { color: C.sky };
  if (label.startsWith("Matched")) return { color: C.purple };
  return { color: C.amber };
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg, padding: 20 },
  header:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title:           { color: C.text, fontSize: 20, fontWeight: "700" },

  // centre pane (pick / resolving / importing steps)
  centerPane:      { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 12 },
  iconCircle:      { width: 80, height: 80, borderRadius: 40, backgroundColor: C.sky + "18", alignItems: "center", justifyContent: "center" },
  heading:         { color: C.text, fontSize: 18, fontWeight: "600", textAlign: "center" },
  hint:            { color: C.textMid, fontSize: 14, textAlign: "center", lineHeight: 21 },
  error:           { color: C.red, fontSize: 13, textAlign: "center" },

  pickBtn:         { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.sky, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
  pickBtnText:     { color: C.bg, fontWeight: "700", fontSize: 15 },

  // review step
  label:           { color: C.textMid, fontSize: 13, fontWeight: "500", marginBottom: 8, marginTop: 16 },
  input:           { backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border },
  emojiRow:        { flexDirection: "row" },
  emojiBtn:        { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  emojiBtnActive:  { borderColor: C.sky, backgroundColor: C.sky + "18" },
  emojiText:       { fontSize: 22 },

  membersCard:     { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  memberRow:       { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  memberRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  memberInfo:      { flex: 1, gap: 2 },
  memberName:      { color: C.text, fontSize: 15, fontWeight: "500" },
  memberSub:       { color: C.textDim, fontSize: 11 },
  badge:           { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:       { fontSize: 11, fontWeight: "600" },

  youHint:         { color: C.textDim, fontSize: 12, marginTop: -2, marginBottom: 8 },
  youRow:          { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  youChip:         { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  youChipActive:   { borderColor: C.green, backgroundColor: C.green + "1a" },
  youChipText:     { color: C.textMid, fontSize: 13, fontWeight: "500" },

  summaryCard:     { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.sky + "12", borderRadius: 12, borderWidth: 1, borderColor: C.sky + "30", padding: 14, marginTop: 16 },
  summaryText:     { color: C.textMid, fontSize: 14, flex: 1 },

  importBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.sky, borderRadius: 14, paddingVertical: 16, marginTop: 16, marginBottom: 8 },
  importBtnText:   { color: C.bg, fontWeight: "700", fontSize: 16 },
});
