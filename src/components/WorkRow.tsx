import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { WorkEntry } from "../lib/types";
import { formatDate } from "../lib/utils";
import { useStore } from "../store/StoreContext";
import { tallyWork } from "../lib/work";
import WorkCategoryIcon from "./WorkCategoryIcon";
import WorkStatusBadge from "./WorkStatusBadge";
import WorkDetailModal from "./WorkDetailModal";
import { C } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeContext";

/** Compact, row-style representation of a work entry — mirrors ExpenseRow. */
export default function WorkRow({ entry }: { entry: WorkEntry }) {
  const s = useThemedStyles(makeStyles);
  const { data, memberById, groupById } = useStore();
  const [detailVisible, setDetailVisible] = useState(false);

  const creator = memberById.get(entry.createdBy);
  const status  = tallyWork(entry, data.workVotes, groupById.get(entry.groupId)).status;

  return (
    <>
      <TouchableOpacity style={s.row} onPress={() => setDetailVisible(true)} activeOpacity={0.6}>
        <WorkCategoryIcon category={entry.category} size={18} />
        <View style={s.info}>
          <Text style={s.title} numberOfLines={1}>{entry.title}</Text>
          <Text style={s.meta} numberOfLines={1}>
            {formatDate(entry.date)}{"  ·  "}
            <Text style={{ color: creator?.color ?? C.textMid }}>{creator?.name ?? "Unknown"}</Text>
          </Text>
        </View>
        <WorkStatusBadge status={status} small />
      </TouchableOpacity>

      <WorkDetailModal entry={entry} visible={detailVisible} onClose={() => setDetailVisible(false)} />
    </>
  );
}

const makeStyles = () => StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  info:  { flex: 1, gap: 3 },
  title: { color: C.text, fontSize: 15, fontWeight: "500" },
  meta:  { color: C.textMid, fontSize: 12 },
});
