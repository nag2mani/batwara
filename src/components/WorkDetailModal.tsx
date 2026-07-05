import React from "react";
import {
  Modal, View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, Alert, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "./Icon";
import type { WorkEntry } from "../lib/types";
import { EFFORT_META } from "../lib/types";
import { formatDateLong, uid, todayISO } from "../lib/utils";
import { useStore } from "../store/StoreContext";
import { tallyWork, isExpired, msUntilExpiry, effortPoints } from "../lib/work";
import WorkCategoryIcon from "./WorkCategoryIcon";
import WorkStatusBadge from "./WorkStatusBadge";
import WorkReactionsBar from "./WorkReactionsBar";
import Avatar from "./Avatar";
import { C } from "../theme/colors";

interface Props {
  entry: WorkEntry | null;
  visible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get("window");

function expiryLabel(ms: number): string {
  const h = Math.floor(ms / 3600_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left to validate`;
  if (h >= 1)  return `${h}h left to validate`;
  return `${Math.max(1, Math.floor(ms / 60_000))}m left to validate`;
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.infoRow, !last && s.infoDivider]}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

export default function WorkDetailModal({ entry, visible, onClose }: Props) {
  const { data, memberById, groupById, dispatch, meId } = useStore();

  if (!entry) return null;

  const group   = groupById.get(entry.groupId);
  const creator = memberById.get(entry.createdBy);
  const tally   = tallyWork(entry, data.workVotes, group);
  const expired = isExpired(entry);
  const isMine  = entry.createdBy === meId;
  const myVote  = data.workVotes.find((v) => v.workId === entry.id && v.userId === meId);
  const canVote = !isMine && tally.status === "pending" && !expired && tally.eligible > 0;

  const voters = data.workVotes
    .filter((v) => v.workId === entry.id)
    .map((v) => ({ ...v, member: memberById.get(v.userId) }));

  function castVote(vote: "approve" | "reject") {
    if (myVote?.vote === vote) {
      dispatch({ type: "RETRACT_VOTE", workId: entry!.id, userId: meId });
    } else {
      dispatch({
        type: "SET_VOTE",
        vote: { id: uid("v"), workId: entry!.id, userId: meId, vote, createdAt: todayISO() },
      });
    }
  }

  function confirmDelete() {
    Alert.alert("Delete work", `Delete "${entry!.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { dispatch({ type: "DELETE_WORK", id: entry!.id }); onClose(); } },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.container} edges={["top", "bottom"]}>
        <View style={s.header}>
          <Text style={s.title}>Work details</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={C.textMid} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={s.hero}>
            <WorkCategoryIcon category={entry.category} size={28} />
            <Text style={s.heroTitle}>{entry.title}</Text>
            <WorkStatusBadge status={tally.status} />
          </View>

          {/* Submitter */}
          <View style={s.submitter}>
            <Avatar name={creator?.name ?? "?"} color={creator?.color ?? C.textMid} size="sm" />
            <View style={{ flex: 1 }}>
              <Text style={s.submitterName}>{creator?.name ?? "Unknown"}</Text>
              <Text style={s.submitterSub}>submitted {formatDateLong(entry.createdAt)}</Text>
            </View>
            <View style={[s.pointsPill, { backgroundColor: EFFORT_META[entry.effort].soft }]}>
              <Text style={[s.pointsText, { color: EFFORT_META[entry.effort].color }]}>+{effortPoints(entry)} pts</Text>
            </View>
          </View>

          {entry.description ? <Text style={s.desc}>{entry.description}</Text> : null}

          {/* Images */}
          {entry.images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.gallery}>
              {entry.images.map((uri, i) => (
                <Image key={uri + i} source={{ uri }} style={s.galleryImg} />
              ))}
            </ScrollView>
          )}

          {/* Info */}
          <View style={s.card}>
            <InfoRow label="Category" value={entry.category} />
            <InfoRow label="Effort" value={`${entry.effort} · ${effortPoints(entry)} pts`} />
            <InfoRow label="Duration" value={`${entry.durationMinutes} min`} />
            {group && <InfoRow label="Group" value={`${group.emoji} ${group.name}`} />}
            <InfoRow label="Done on" value={formatDateLong(entry.date)} last />
          </View>

          {/* Validation progress */}
          <Text style={s.sectionLabel}>Validation</Text>
          <View style={s.card}>
            <View style={s.progressRow}>
              <Text style={s.progressText}>
                {tally.approvals} / {tally.approvalsNeeded} approvals needed
              </Text>
              <Text style={s.progressSub}>{tally.eligible} eligible voter{tally.eligible === 1 ? "" : "s"}</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, {
                width: `${tally.approvalsNeeded ? Math.min(100, (tally.approvals / tally.approvalsNeeded) * 100) : 0}%`,
                backgroundColor: tally.status === "rejected" ? C.red : C.green,
              }]} />
            </View>
            {tally.rejections > 0 && (
              <Text style={s.rejLine}>{tally.rejections} rejection{tally.rejections === 1 ? "" : "s"}</Text>
            )}
            {tally.status === "pending" && (
              <Text style={[s.expiry, expired && { color: C.red }]}>
                {expired ? "Validation window expired" : expiryLabel(msUntilExpiry(entry))}
              </Text>
            )}

            {/* Voter chips */}
            {voters.length > 0 && (
              <View style={s.voterList}>
                {voters.map((v) => (
                  <View key={v.id} style={s.voterChip}>
                    <Ionicons
                      name={v.vote === "approve" ? "checkmark-circle" : "close-circle"}
                      size={14}
                      color={v.vote === "approve" ? C.green : C.red}
                    />
                    <Text style={s.voterName}>{v.member?.name ?? "?"}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Vote actions */}
          {canVote && (
            <View style={s.voteRow}>
              <TouchableOpacity
                style={[s.voteBtn, s.approveBtn, myVote?.vote === "approve" && s.approveActive]}
                onPress={() => castVote("approve")}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark" size={18} color={myVote?.vote === "approve" ? C.bg : C.green} />
                <Text style={[s.voteText, { color: myVote?.vote === "approve" ? C.bg : C.green }]}>
                  {myVote?.vote === "approve" ? "Approved" : "Approve"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.voteBtn, s.rejectBtn, myVote?.vote === "reject" && s.rejectActive]}
                onPress={() => castVote("reject")}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={18} color={myVote?.vote === "reject" ? C.bg : C.red} />
                <Text style={[s.voteText, { color: myVote?.vote === "reject" ? C.bg : C.red }]}>
                  {myVote?.vote === "reject" ? "Rejected" : "Reject"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {isMine && (
            <View style={s.noteBox}>
              <Ionicons name="information-circle-outline" size={16} color={C.textMid} />
              <Text style={s.noteText}>You can't validate your own work — waiting on your roommates.</Text>
            </View>
          )}

          {/* Reactions */}
          <Text style={s.sectionLabel}>Reactions</Text>
          <WorkReactionsBar workId={entry.id} />
        </ScrollView>

        {isMine && (
          <TouchableOpacity style={s.deleteBtn} onPress={confirmDelete} activeOpacity={0.85}>
            <Ionicons name="trash-outline" size={18} color={C.red} />
            <Text style={s.deleteText}>Delete work</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20 },
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16 },
  title:         { color: C.text, fontSize: 20, fontWeight: "700" },
  scroll:        { paddingBottom: 24 },
  hero:          { alignItems: "center", gap: 10, paddingVertical: 12 },
  heroTitle:     { color: C.text, fontSize: 22, fontWeight: "700", textAlign: "center", marginTop: 4 },
  submitter:     { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  submitterName: { color: C.text, fontSize: 15, fontWeight: "600" },
  submitterSub:  { color: C.textMid, fontSize: 12 },
  pointsPill:    { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  pointsText:    { fontSize: 12, fontWeight: "700" },
  desc:          { color: C.textMid, fontSize: 15, lineHeight: 21, marginTop: 14 },
  gallery:       { flexDirection: "row", marginTop: 14 },
  galleryImg:    { width: width * 0.6, height: width * 0.45, borderRadius: 14, backgroundColor: C.card, marginRight: 10 },
  card:          { backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: C.border, marginTop: 8 },
  infoRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
  infoDivider:   { borderBottomWidth: 1, borderBottomColor: C.border },
  infoLabel:     { color: C.textMid, fontSize: 14 },
  infoValue:     { color: C.text, fontSize: 14, fontWeight: "600", flexShrink: 1, textAlign: "right", marginLeft: 12 },
  sectionLabel:  { color: C.textMid, fontSize: 13, fontWeight: "500", marginTop: 20, marginBottom: 8 },
  progressRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16 },
  progressText:  { color: C.text, fontSize: 15, fontWeight: "600" },
  progressSub:   { color: C.textMid, fontSize: 12 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: C.bg3, marginTop: 12, overflow: "hidden" },
  progressFill:  { height: 8, borderRadius: 4 },
  rejLine:       { color: C.red, fontSize: 12, marginTop: 8 },
  expiry:        { color: C.amber, fontSize: 12, marginTop: 8, paddingBottom: 16 },
  voterList:     { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 16, paddingTop: 4 },
  voterChip:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.bg2, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  voterName:     { color: C.textMid, fontSize: 12, fontWeight: "500" },
  voteRow:       { flexDirection: "row", gap: 12, marginTop: 16 },
  voteBtn:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 15, borderWidth: 1 },
  approveBtn:    { borderColor: C.green + "66", backgroundColor: C.green + "1a" },
  approveActive: { backgroundColor: C.green, borderColor: C.green },
  rejectBtn:     { borderColor: C.red + "66", backgroundColor: C.red + "1a" },
  rejectActive:  { backgroundColor: C.red, borderColor: C.red },
  voteText:      { fontSize: 15, fontWeight: "700" },
  noteBox:       { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.card, borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: C.border },
  noteText:      { color: C.textMid, fontSize: 13, flex: 1, lineHeight: 18 },
  deleteBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.red + "1a", borderRadius: 14, paddingVertical: 15, marginVertical: 12, borderWidth: 1, borderColor: C.red + "40" },
  deleteText:    { color: C.red, fontWeight: "700", fontSize: 15 },
});
