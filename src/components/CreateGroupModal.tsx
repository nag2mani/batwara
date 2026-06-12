import React, { useState, useCallback } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store/StoreContext";
import { useAuth } from "../auth/AuthContext";
import { uid, todayISO } from "../lib/utils";
import { searchProfiles, type Profile } from "../lib/profiles";
import { isSupabaseConfigured } from "../lib/supabase";
import { MEMBER_COLORS } from "../theme/colors";
import { C } from "../theme/colors";
import type { Member } from "../lib/types";
import Avatar from "./Avatar";

const EMOJIS = ["🏠", "🏖️", "🍱", "✈️", "🎉", "🎮", "🏕️", "🛒", "🚗", "💼", "🎵", "⚽"];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function CreateGroupModal({ visible, onClose }: Props) {
  const { data, dispatch, meId } = useStore();
  const { user } = useAuth();

  const [name,         setName]         = useState("");
  const [emoji,        setEmoji]        = useState("🏠");
  const [selected,     setSelected]     = useState<Member[]>([]);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [searchResults,setSearchResults]= useState<Profile[]>([]);
  const [searching,    setSearching]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const selectedIds = selected.map((m) => m.id);

  function reset() {
    setName(""); setEmoji("🏠"); setSelected([]); setSearchQuery("");
    setSearchResults([]); setError(null);
  }

  function handleClose() { reset(); onClose(); }

  function removeMember(id: string) {
    setSelected((prev) => prev.filter((m) => m.id !== id));
  }

  // Debounced profile search
  const runSearch = useCallback(async (q: string) => {
    if (!isSupabaseConfigured) return;
    setSearching(true);
    // Exclude self and already-selected members
    const exclude = [meId, ...selectedIds];
    const results = await searchProfiles(q, exclude);
    setSearchResults(results);
    setSearching(false);
  }, [meId, selectedIds]);

  function onSearchChange(q: string) {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    runSearch(q);
  }

  function addProfile(profile: Profile) {
    const member: Member = {
      id: profile.id,
      name: profile.display_name,
      color: profile.color ?? MEMBER_COLORS[selected.length % MEMBER_COLORS.length],
    };
    setSelected((prev) => [...prev, member]);
    setSearchQuery("");
    setSearchResults([]);
  }

  function submit() {
    setError(null);
    if (!name.trim()) { setError("Group name required"); return; }
    if (selected.length === 0) { setError("Add at least one other member"); return; }

    // Determine which selected members are new (not yet in local members list)
    const existingIds = new Set(data.members.map((m) => m.id));
    const newMembers = selected.filter((m) => !existingIds.has(m.id));

    // meId is the current user's ID — always the first member of any group they create
    const allMemberIds = [meId, ...selected.map((m) => m.id)];

    dispatch({
      type: "ADD_GROUP",
      group: {
        id: uid("g"),
        name: name.trim(),
        emoji,
        memberIds: allMemberIds,
        createdAt: todayISO(),
      },
      newMembers,
    });

    handleClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>New group</Text>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color={C.textMid} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Emoji picker */}
          <Text style={s.label}>Emoji</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.emojiRow}>
            {EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                style={[s.emojiBtn, emoji === e && s.emojiBtnActive]}
                onPress={() => setEmoji(e)}
              >
                <Text style={s.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Group name */}
          <Text style={s.label}>Group name</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Goa Trip, Flat 4B"
            placeholderTextColor={C.textDim}
            value={name}
            onChangeText={setName}
          />

          {/* Member search */}
          <Text style={s.label}>Add members</Text>

          {isSupabaseConfigured ? (
            <>
              <View style={s.searchWrap}>
                <Ionicons name="search-outline" size={18} color={C.textDim} style={s.searchIcon} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search by name or email..."
                  placeholderTextColor={C.textDim}
                  value={searchQuery}
                  onChangeText={onSearchChange}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {searching && <ActivityIndicator size="small" color={C.textDim} style={{ marginRight: 10 }} />}
              </View>

              {/* Search results */}
              {searchResults.length > 0 && (
                <View style={s.resultsBox}>
                  {searchResults.map((profile) => (
                    <TouchableOpacity
                      key={profile.id}
                      style={s.resultRow}
                      onPress={() => addProfile(profile)}
                      activeOpacity={0.7}
                    >
                      <View style={[s.resultAvatar, { backgroundColor: (profile.color ?? C.green) + "26" }]}>
                        <Text style={[s.resultAvatarText, { color: profile.color ?? C.green }]}>
                          {profile.display_name.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={s.resultInfo}>
                        <Text style={s.resultName}>{profile.display_name}</Text>
                        <Text style={s.resultEmail}>{profile.email}</Text>
                      </View>
                      <Ionicons name="add-circle-outline" size={22} color={C.green} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
                <Text style={s.noResults}>No users found matching "{searchQuery}"</Text>
              )}
            </>
          ) : (
            <Text style={s.offlineNote}>
              Connect Supabase to search registered users. Add your credentials to .env to enable this feature.
            </Text>
          )}

          {/* Selected members */}
          {selected.length > 0 && (
            <>
              <Text style={[s.label, { marginTop: 20 }]}>Added ({selected.length})</Text>
              {selected.map((m) => (
                <View key={m.id} style={s.selectedRow}>
                  <Avatar name={m.name} color={m.color} size="sm" />
                  <View style={s.selectedInfo}>
                    <Text style={s.selectedName}>{m.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeMember(m.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={22} color={C.textDim} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {error && <Text style={s.error}>{error}</Text>}
        </ScrollView>

        <TouchableOpacity
          style={[s.submitBtn, selected.length === 0 && s.submitBtnDisabled]}
          onPress={submit}
          activeOpacity={0.8}
        >
          <Text style={s.submitText}>
            Create group{selected.length > 0 ? ` · ${selected.length + 1} members` : ""}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg, padding: 20 },
  header:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title:           { color: C.text, fontSize: 20, fontWeight: "700" },
  label:           { color: C.textMid, fontSize: 13, fontWeight: "500", marginBottom: 8, marginTop: 16 },
  input:           { backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border },
  emojiRow:        { flexDirection: "row" },
  emojiBtn:        { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  emojiBtnActive:  { borderColor: C.green, backgroundColor: C.green + "1a" },
  emojiText:       { fontSize: 22 },
  // Search
  searchWrap:      { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingRight: 4 },
  searchIcon:      { paddingLeft: 14, paddingRight: 4 },
  searchInput:     { flex: 1, paddingVertical: 14, paddingRight: 12, color: C.text, fontSize: 15 },
  resultsBox:      { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginTop: 6, overflow: "hidden" },
  resultRow:       { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  resultAvatar:    { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  resultAvatarText:{ fontSize: 13, fontWeight: "700" },
  resultInfo:      { flex: 1 },
  resultName:      { color: C.text, fontSize: 15, fontWeight: "500" },
  resultEmail:     { color: C.textMid, fontSize: 12, marginTop: 1 },
  noResults:       { color: C.textDim, fontSize: 13, marginTop: 8, textAlign: "center", paddingVertical: 4 },
  offlineNote:     { color: C.textDim, fontSize: 13, lineHeight: 20, paddingVertical: 8 },
  // Selected members
  selectedRow:     { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  selectedInfo:    { flex: 1 },
  selectedName:    { color: C.text, fontSize: 15, fontWeight: "500" },
  // Actions
  error:           { color: C.red, fontSize: 13, marginTop: 12, textAlign: "center" },
  submitBtn:       { backgroundColor: C.green, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 16 },
  submitBtnDisabled:{ backgroundColor: C.green + "55" },
  submitText:      { color: C.bg, fontWeight: "700", fontSize: 16 },
});
