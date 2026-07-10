import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "./Icon";
import { useStore } from "../store/StoreContext";
import {
  computeUserStats, rankByContribution, rangeStartMs, type LeaderboardRange,
} from "../lib/work";
import { minutesToHours } from "../lib/utils";
import Avatar from "./Avatar";
import UserContributionModal from "./UserContributionModal";
import { C } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeContext";

const RANGES: { key: LeaderboardRange; label: string }[] = [
  { key: "week",  label: "Weekly" },
  { key: "month", label: "Monthly" },
  { key: "all",   label: "All time" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

export default function WorkLeaderboard({ groupId }: { groupId: string }) {
  const s = useThemedStyles(makeStyles);
  const { data, memberById, groupById } = useStore();
  const [range, setRange]     = useState<LeaderboardRange>("week");
  const [profileId, setProfileId] = useState<string | null>(null);

  const group   = groupById.get(groupId);
  const entries = data.work.filter((w) => w.groupId === groupId);
  const stats   = computeUserStats(entries, data.workVotes, group, rangeStartMs(range));
  const ranked  = rankByContribution([...stats.values()]);

  return (
    <View style={s.wrap}>
      {/* Range tabs */}
      <View style={s.segment}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[s.segBtn, range === r.key && s.segBtnActive]}
            onPress={() => setRange(r.key)}
          >
            <Text style={[s.segText, range === r.key && { color: C.green }]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {ranked.every((r) => r.points === 0) ? (
        <View style={s.empty}>
          <Ionicons name="trophy-outline" size={40} color={C.textDim} />
          <Text style={s.emptyText}>No verified work in this period yet</Text>
        </View>
      ) : (
        ranked.map((row, i) => {
          const m = memberById.get(row.memberId);
          if (!m) return null;
          const top = i < 3 && row.points > 0;
          return (
            <TouchableOpacity
              key={row.memberId}
              style={[s.row, top && s.rowTop]}
              activeOpacity={0.7}
              onPress={() => setProfileId(row.memberId)}
            >
              <Text style={s.rank}>{top ? MEDALS[i] : `#${i + 1}`}</Text>
              <Avatar name={m.name} color={m.color} size="sm" />
              <View style={s.info}>
                <Text style={s.name}>{m.name}</Text>
                <Text style={s.sub}>
                  {row.verified} verified · {minutesToHours(row.minutes)}h
                </Text>
              </View>
              <View style={s.pointsBox}>
                <Text style={s.points}>{row.points}</Text>
                <Text style={s.pointsLabel}>pts</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      <UserContributionModal
        memberId={profileId}
        groupId={groupId}
        visible={profileId != null}
        onClose={() => setProfileId(null)}
      />
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  wrap:        { gap: 10 },
  segment:     { flexDirection: "row", backgroundColor: C.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: C.border },
  segBtn:      { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  segBtnActive:{ backgroundColor: C.green + "1a" },
  segText:     { color: C.textMid, fontSize: 13, fontWeight: "600" },
  row:         { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border },
  rowTop:      { borderColor: C.amber + "40" },
  rank:        { color: C.textMid, fontSize: 15, fontWeight: "700", width: 28, textAlign: "center" },
  info:        { flex: 1, gap: 2 },
  name:        { color: C.text, fontSize: 15, fontWeight: "600" },
  sub:         { color: C.textMid, fontSize: 12 },
  pointsBox:   { alignItems: "flex-end" },
  points:      { color: C.amber, fontSize: 20, fontWeight: "700", letterSpacing: -0.5 },
  pointsLabel: { color: C.textDim, fontSize: 10, marginTop: -2 },
  empty:       { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 40 },
  emptyText:   { color: C.textMid, fontSize: 14 },
});
