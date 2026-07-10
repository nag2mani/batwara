import React from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "./Icon";
import { WORK_CATEGORY_META, type WorkCategory } from "../lib/types";
import { useStore } from "../store/StoreContext";
import { computeUserStats, tallyWork } from "../lib/work";
import { minutesToHours } from "../lib/utils";
import Avatar from "./Avatar";
import WorkCard from "./WorkCard";
import { C } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeContext";

interface Props {
  memberId: string | null;
  groupId: string;
  visible: boolean;
  onClose: () => void;
}

function Stat({ value, label, color }: { value: string | number; label: string; color?: string }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, color && { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export default function UserContributionModal({ memberId, groupId, visible, onClose }: Props) {
  const s = useThemedStyles(makeStyles);
  const { data, memberById, groupById } = useStore();

  if (!memberId) return null;
  const member = memberById.get(memberId);
  const group  = groupById.get(groupId);

  const mine = data.work
    .filter((w) => w.groupId === groupId && w.createdBy === memberId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const stats = computeUserStats(mine, data.workVotes, group).get(memberId);

  // Category breakdown (verified only)
  const byCat = new Map<WorkCategory, number>();
  mine.forEach((w) => {
    if (tallyWork(w, data.workVotes, group).status === "verified") {
      byCat.set(w.category, (byCat.get(w.category) ?? 0) + 1);
    }
  });
  const topCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.container} edges={["top", "bottom"]}>
        <View style={s.header}>
          <Text style={s.title}>Contribution profile</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={C.textMid} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={s.hero}>
            <Avatar name={member?.name ?? "?"} color={member?.color ?? C.textMid} size="lg" />
            <Text style={s.name}>{member?.name ?? "Unknown"}</Text>
            {group && <Text style={s.groupName}>{group.emoji} {group.name}</Text>}
          </View>

          {/* Stat grid */}
          <View style={s.statRow}>
            <Stat value={stats?.points ?? 0}  label="Points"   color={C.amber} />
            <Stat value={stats?.verified ?? 0} label="Verified" color={C.green} />
            <Stat value={minutesToHours(stats?.minutes ?? 0)} label="Hours" color={C.sky} />
          </View>
          <View style={s.statRow}>
            <Stat value={stats?.pending ?? 0}  label="Pending"  color={C.textMid} />
            <Stat value={stats?.rejected ?? 0} label="Rejected" color={C.red} />
            <Stat value={mine.length}          label="Total" />
          </View>

          {/* Category breakdown */}
          {topCats.length > 0 && (
            <>
              <Text style={s.sectionLabel}>Verified work by category</Text>
              <View style={s.card}>
                {topCats.map(([cat, n], i) => {
                  const meta = WORK_CATEGORY_META[cat];
                  return (
                    <View key={cat} style={[s.catRow, i < topCats.length - 1 && s.catDivider]}>
                      <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                      <Text style={s.catName}>{cat}</Text>
                      <Text style={[s.catCount, { color: meta.color }]}>{n}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Work list */}
          <Text style={s.sectionLabel}>All submissions</Text>
          {mine.length === 0 ? (
            <Text style={s.empty}>No work logged yet</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {mine.map((w) => <WorkCard key={w.id} entry={w} />)}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = () => StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20 },
  header:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16 },
  title:        { color: C.text, fontSize: 20, fontWeight: "700" },
  scroll:       { paddingBottom: 24 },
  hero:         { alignItems: "center", gap: 8, paddingVertical: 12 },
  name:         { color: C.text, fontSize: 22, fontWeight: "700", marginTop: 6 },
  groupName:    { color: C.textMid, fontSize: 14 },
  statRow:      { flexDirection: "row", gap: 12, marginTop: 12 },
  stat:         { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: C.border, gap: 3 },
  statValue:    { color: C.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  statLabel:    { color: C.textMid, fontSize: 11 },
  sectionLabel: { color: C.textMid, fontSize: 13, fontWeight: "500", marginTop: 22, marginBottom: 10 },
  card:         { backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: C.border },
  catRow:       { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 },
  catDivider:   { borderBottomWidth: 1, borderBottomColor: C.border },
  catName:      { color: C.text, fontSize: 15, flex: 1 },
  catCount:     { fontSize: 15, fontWeight: "700" },
  empty:        { color: C.textDim, fontSize: 14, textAlign: "center", paddingVertical: 20 },
});
