import React, { useState } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView, Image,
  StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "./Icon";
import type { WorkCategory, EffortLevel } from "../lib/types";
import { WORK_CATEGORIES, WORK_CATEGORY_META, EFFORT_LEVELS, EFFORT_META } from "../lib/types";
import { useStore } from "../store/StoreContext";
import { uid, todayISO, daysAgoISO } from "../lib/utils";
import { C } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  groupId: string;
}

const WHEN_OPTIONS: { label: string; iso: () => string }[] = [
  { label: "Today",      iso: () => todayISO() },
  { label: "Yesterday",  iso: () => daysAgoISO(1) },
  { label: "2 days ago", iso: () => daysAgoISO(2) },
  { label: "3 days ago", iso: () => daysAgoISO(3) },
];

export default function AddWorkModal({ visible, onClose, groupId }: Props) {
  const s = useThemedStyles(makeStyles);
  const { data, dispatch, meId } = useStore();

  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [category,    setCategory]    = useState<WorkCategory>("Cleaning");
  const [effort,      setEffort]      = useState<EffortLevel>("Medium");
  const [duration,    setDuration]    = useState("");
  const [images,      setImages]      = useState<string[]>([]);
  const [whenIdx,     setWhenIdx]     = useState(0);
  const [gId,         setGId]         = useState(groupId);
  const [error,       setError]       = useState<string | null>(null);

  // Keep the group in sync when opened from a different group.
  React.useEffect(() => { if (visible) setGId(groupId); }, [visible, groupId]);

  function reset() {
    setTitle(""); setDescription(""); setCategory("Cleaning"); setEffort("Medium");
    setDuration(""); setImages([]); setWhenIdx(0); setError(null);
  }
  function handleClose() { reset(); onClose(); }

  async function pickImages() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "image/*", multiple: true, copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      setImages((prev) => [...prev, ...res.assets.map((a) => a.uri)]);
    } catch {
      setError("Couldn't attach image");
    }
  }

  function submit() {
    setError(null);
    if (!title.trim())    { setError("Title required"); return; }
    if (!gId)             { setError("Select a group"); return; }
    const mins = parseInt(duration, 10);
    if (isNaN(mins) || mins <= 0) { setError("Enter a valid duration in minutes"); return; }

    dispatch({
      type: "ADD_WORK",
      entry: {
        id: uid("w"),
        groupId: gId,
        createdBy: meId,
        title: title.trim(),
        description: description.trim(),
        category,
        effort,
        durationMinutes: mins,
        images,
        date: WHEN_OPTIONS[whenIdx].iso(),
        createdAt: todayISO(),
      },
    });
    handleClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.container}>
          <View style={s.header}>
            <Text style={s.title}>Log work</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={C.textMid} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.flex} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Group */}
            {data.groups.length > 1 && (
              <>
                <Text style={s.label}>Group</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips}>
                  {data.groups.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={[s.chip, gId === g.id && s.chipActive]}
                      onPress={() => setGId(g.id)}
                    >
                      <Text style={[s.chipText, gId === g.id && { color: C.green }]}>{g.emoji} {g.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Title */}
            <Text style={s.label}>Title</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Washed all the dishes"
              placeholderTextColor={C.textDim}
              value={title}
              onChangeText={setTitle}
            />

            {/* Description */}
            <Text style={s.label}>Description</Text>
            <TextInput
              style={[s.input, s.multiline]}
              placeholder="Add any details (optional)"
              placeholderTextColor={C.textDim}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            {/* Category */}
            <Text style={s.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips}>
              {WORK_CATEGORIES.map((cat) => {
                const meta = WORK_CATEGORY_META[cat];
                const active = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[s.chip, active && { backgroundColor: meta.soft, borderColor: meta.color }]}
                    onPress={() => setCategory(cat)}
                  >
                    <Ionicons name={meta.icon as any} size={14} color={active ? meta.color : C.textMid} />
                    <Text style={[s.chipText, { marginLeft: 6 }, active && { color: meta.color }]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Effort */}
            <Text style={s.label}>Effort level</Text>
            <View style={s.methodRow}>
              {EFFORT_LEVELS.map((lvl) => {
                const meta = EFFORT_META[lvl];
                const active = effort === lvl;
                return (
                  <TouchableOpacity
                    key={lvl}
                    style={[s.methodBtn, active && { borderColor: meta.color, backgroundColor: meta.soft }]}
                    onPress={() => setEffort(lvl)}
                  >
                    <Text style={[s.methodText, active && { color: meta.color }]}>{lvl}</Text>
                    <Text style={[s.methodSub, active && { color: meta.color }]}>{meta.points} pts</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Duration */}
            <Text style={s.label}>Duration (minutes)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 30"
              placeholderTextColor={C.textDim}
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
            />

            {/* When */}
            <Text style={s.label}>When</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips}>
              {WHEN_OPTIONS.map((w, i) => (
                <TouchableOpacity
                  key={w.label}
                  style={[s.chip, whenIdx === i && s.chipActive]}
                  onPress={() => setWhenIdx(i)}
                >
                  <Text style={[s.chipText, whenIdx === i && { color: C.green }]}>{w.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Images */}
            <Text style={s.label}>Photos (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.imageRow}>
              <TouchableOpacity style={s.addImage} onPress={pickImages}>
                <Ionicons name="camera-outline" size={22} color={C.textMid} />
                <Text style={s.addImageText}>Add</Text>
              </TouchableOpacity>
              {images.map((uri, i) => (
                <View key={uri + i} style={s.thumbWrap}>
                  <Image source={{ uri }} style={s.thumb} />
                  <TouchableOpacity
                    style={s.thumbRemove}
                    onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="close" size={12} color={C.text} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            {error && <Text style={s.error}>{error}</Text>}
            <View style={{ height: 12 }} />
          </ScrollView>

          <TouchableOpacity style={s.submitBtn} onPress={submit} activeOpacity={0.8}>
            <Text style={s.submitText}>Submit for validation</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = () => StyleSheet.create({
  flex:         { flex: 1 },
  container:    { flex: 1, backgroundColor: C.bg, padding: 20 },
  header:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title:        { color: C.text, fontSize: 20, fontWeight: "700" },
  label:        { color: C.textMid, fontSize: 13, fontWeight: "500", marginBottom: 8, marginTop: 16 },
  input:        { backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border },
  multiline:    { minHeight: 70, textAlignVertical: "top" },
  chips:        { flexDirection: "row" },
  chip:         { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, marginRight: 8, backgroundColor: C.card },
  chipActive:   { borderColor: C.green, backgroundColor: C.green + "1a" },
  chipText:     { color: C.textMid, fontSize: 13, fontWeight: "500" },
  methodRow:    { flexDirection: "row", gap: 8 },
  methodBtn:    { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: "center", backgroundColor: C.card, gap: 2 },
  methodText:   { color: C.textMid, fontSize: 14, fontWeight: "600" },
  methodSub:    { color: C.textDim, fontSize: 11, fontWeight: "500" },
  imageRow:     { flexDirection: "row" },
  addImage:     { width: 72, height: 72, borderRadius: 12, borderWidth: 1, borderColor: C.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center", marginRight: 10, backgroundColor: C.card, gap: 2 },
  addImageText: { color: C.textMid, fontSize: 11 },
  thumbWrap:    { marginRight: 10 },
  thumb:        { width: 72, height: 72, borderRadius: 12, backgroundColor: C.card },
  thumbRemove:  { position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: C.red, alignItems: "center", justifyContent: "center" },
  error:        { color: C.red, fontSize: 13, marginTop: 12, textAlign: "center" },
  submitBtn:    { backgroundColor: C.green, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 12 },
  submitText:   { color: C.bg, fontWeight: "700", fontSize: 16 },
});
