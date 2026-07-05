import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "./Icon";
import type { WorkEntry } from "../lib/types";
import { EFFORT_META } from "../lib/types";
import { formatDate, effortPointsLabel } from "../lib/utils";
import { useStore } from "../store/StoreContext";
import { tallyWork, effortPoints } from "../lib/work";
import WorkCategoryIcon from "./WorkCategoryIcon";
import WorkStatusBadge from "./WorkStatusBadge";
import WorkReactionsBar from "./WorkReactionsBar";
import WorkDetailModal from "./WorkDetailModal";
import { C } from "../theme/colors";

interface Props {
  entry: WorkEntry;
  showReactions?: boolean;
}

export default function WorkCard({ entry, showReactions }: Props) {
  const { data, memberById, groupById } = useStore();
  const [open, setOpen] = useState(false);

  const group   = groupById.get(entry.groupId);
  const creator = memberById.get(entry.createdBy);
  const tally   = tallyWork(entry, data.workVotes, group);
  const effortMeta = EFFORT_META[entry.effort];

  return (
    <>
      <TouchableOpacity style={s.card} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <View style={s.top}>
          <WorkCategoryIcon category={entry.category} size={20} />
          <View style={s.info}>
            <Text style={s.title} numberOfLines={1}>{entry.title}</Text>
            <Text style={s.meta} numberOfLines={1}>
              <Text style={{ color: creator?.color ?? C.textMid }}>{creator?.name ?? "Unknown"}</Text>
              {"  ·  "}{formatDate(entry.date)}
            </Text>
          </View>
          <WorkStatusBadge status={tally.status} small />
        </View>

        <View style={s.tags}>
          <View style={s.tag}>
            <Ionicons name="pricetag-outline" size={12} color={C.textMid} />
            <Text style={s.tagText}>{entry.category}</Text>
          </View>
          <View style={s.tag}>
            <Ionicons name="time-outline" size={12} color={C.textMid} />
            <Text style={s.tagText}>{entry.durationMinutes}m</Text>
          </View>
          <View style={[s.tag, { backgroundColor: effortMeta.soft }]}>
            <Text style={[s.tagText, { color: effortMeta.color, fontWeight: "700" }]}>{entry.effort}</Text>
          </View>
          <View style={s.tag}>
            <Ionicons name="trophy-outline" size={12} color={C.amber} />
            <Text style={[s.tagText, { color: C.amber }]}>{effortPointsLabel(effortPoints(entry))}</Text>
          </View>
          <View style={s.tagRight}>
            <Ionicons name="thumbs-up-outline" size={12} color={C.green} />
            <Text style={[s.tagText, { color: C.green }]}>{tally.approvals}/{tally.approvalsNeeded || "–"}</Text>
          </View>
        </View>

        {showReactions && (
          <View style={s.reactions}>
            <WorkReactionsBar workId={entry.id} />
          </View>
        )}
      </TouchableOpacity>

      <WorkDetailModal entry={entry} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const s = StyleSheet.create({
  card:      { backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, gap: 12 },
  top:       { flexDirection: "row", alignItems: "center", gap: 12 },
  info:      { flex: 1, gap: 3 },
  title:     { color: C.text, fontSize: 15, fontWeight: "600" },
  meta:      { color: C.textMid, fontSize: 12 },
  tags:      { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  tag:       { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.bg2, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  tagRight:  { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" },
  tagText:   { color: C.textMid, fontSize: 12, fontWeight: "500" },
  reactions: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
});
