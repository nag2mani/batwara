import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Pressable, RefreshControl } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "../components/Icon";
import { useStore } from "../store/StoreContext";
import { tallyWork, isExpired, msUntilExpiry, effortPoints } from "../lib/work";
import { minutesToHours } from "../lib/utils";
import { C } from "../theme/colors";
import WorkCard from "../components/WorkCard";
import WorkLeaderboard from "../components/WorkLeaderboard";
import AddWorkModal from "../components/AddWorkModal";
import AddFab from "../components/AddFab";

type Segment = "feed" | "pending" | "board";

const SEGMENTS: { key: Segment; label: string; icon: string }[] = [
  { key: "feed",    label: "Feed",    icon: "pulse-outline" },
  { key: "pending", label: "Pending", icon: "hourglass-outline" },
  { key: "board",   label: "Board",   icon: "trophy-outline" },
];

function StatTile({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) {
  return (
    <View style={s.tile}>
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={[s.tileValue, { color }]}>{value}</Text>
      <Text style={s.tileLabel}>{label}</Text>
    </View>
  );
}

export default function WorkScreen() {
  const { data, groupById, meId, reload, refreshing } = useStore();
  const insets = useSafeAreaInsets();
  const [groupId, setGroupId] = useState<string>(data.groups[0]?.id ?? "");
  const [segment, setSegment] = useState<Segment>("feed");
  const [addVisible, setAddVisible] = useState(false);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);

  // Keep a valid group selected as groups load/change.
  const activeGroupId = data.groups.find((g) => g.id === groupId)?.id ?? data.groups[0]?.id ?? "";
  const group = groupById.get(activeGroupId);

  const entries = useMemo(
    () => data.work.filter((w) => w.groupId === activeGroupId),
    [data.work, activeGroupId],
  );

  // Group-level tallies for the dashboard.
  const dash = useMemo(() => {
    let verified = 0, pending = 0, rejected = 0, minutes = 0, points = 0;
    for (const e of entries) {
      const t = tallyWork(e, data.workVotes, group);
      if (t.status === "verified") { verified++; minutes += e.durationMinutes; points += effortPoints(e); }
      else if (t.status === "rejected") rejected++;
      else pending++;
    }
    return { verified, pending, rejected, minutes, points };
  }, [entries, data.workVotes, group]);

  const verifiedFeed = useMemo(
    () => entries
      .filter((e) => tallyWork(e, data.workVotes, group).status === "verified")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [entries, data.workVotes, group],
  );

  const pendingEntries = useMemo(
    () => entries
      .filter((e) => tallyWork(e, data.workVotes, group).status === "pending")
      .sort((a, b) => msUntilExpiry(a) - msUntilExpiry(b)),
    [entries, data.workVotes, group],
  );

  // Submissions awaiting THIS user's validation (in-app notification signal).
  const awaitingMe = pendingEntries.filter(
    (e) => e.createdBy !== meId
      && !isExpired(e)
      && !data.workVotes.some((v) => v.workId === e.id && v.userId === meId),
  );

  // ---- No groups yet ----
  if (data.groups.length === 0) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}><Text style={s.title}>Work</Text></View>
        <View style={s.empty}>
          <Ionicons name="construct-outline" size={48} color={C.textDim} />
          <Text style={s.emptyText}>Create a group first</Text>
          <Text style={s.emptySub}>The work ledger tracks household chores within a group.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Work</Text>
        <View style={s.headerRight}>
          {awaitingMe.length > 0 && (
            <View style={s.headerBadge}>
              <Ionicons name="notifications" size={13} color={C.amber} />
              <Text style={s.headerBadgeText}>{awaitingMe.length} to validate</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={reload}
            disabled={refreshing}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="refresh" size={22} color={refreshing ? C.textDim : C.green} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Group dropdown */}
      <View style={s.pickerWrap}>
        <TouchableOpacity style={s.trigger} onPress={() => setGroupMenuOpen(true)} activeOpacity={0.8}>
          <Ionicons name="people-outline" size={16} color={C.green} />
          <Text style={s.triggerText} numberOfLines={1}>
            {group ? `${group.emoji} ${group.name}` : "Select a group"}
          </Text>
          <Ionicons name="chevron-down" size={16} color={C.textMid} />
        </TouchableOpacity>
      </View>

      <Modal visible={groupMenuOpen} transparent animationType="fade" onRequestClose={() => setGroupMenuOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setGroupMenuOpen(false)}>
          <View style={[s.menu, { top: insets.top + 100 }]}>
            <Text style={s.menuHeading}>Your groups</Text>
            {data.groups.map((g, i) => {
              const active = g.id === activeGroupId;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[s.menuItem, i === 0 && s.menuFirst]}
                  onPress={() => { setGroupId(g.id); setGroupMenuOpen(false); }}
                >
                  <Text style={[s.menuText, active && { color: C.green, fontWeight: "700" }]} numberOfLines={1}>
                    {g.emoji} {g.name}
                  </Text>
                  {active && <Ionicons name="checkmark" size={16} color={C.green} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={C.green} colors={[C.green]} />
        }
      >
        {/* Dashboard */}
        <View style={s.tileRow}>
          <StatTile icon="trophy" value={dash.points} label="Points" color={C.amber} />
          <StatTile icon="checkmark-circle" value={dash.verified} label="Verified" color={C.green} />
          <StatTile icon="time" value={minutesToHours(dash.minutes)} label="Hours" color={C.sky} />
        </View>
        <View style={s.tileRow}>
          <StatTile icon="hourglass" value={dash.pending} label="Pending" color={C.textMid} />
          <StatTile icon="close-circle" value={dash.rejected} label="Rejected" color={C.red} />
          <StatTile icon="albums" value={entries.length} label="Total" color={C.purple} />
        </View>

        {/* Segmented control */}
        <View style={s.segment}>
          {SEGMENTS.map((seg) => {
            const active = segment === seg.key;
            const showDot = seg.key === "pending" && awaitingMe.length > 0;
            return (
              <TouchableOpacity key={seg.key} style={[s.segBtn, active && s.segBtnActive]} onPress={() => setSegment(seg.key)}>
                <Ionicons name={seg.icon as any} size={16} color={active ? C.green : C.textMid} />
                <Text style={[s.segText, active && { color: C.green }]}>{seg.label}</Text>
                {showDot && <View style={s.segDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Segment content */}
        {segment === "feed" && (
          verifiedFeed.length === 0 ? (
            <EmptyBlock icon="pulse-outline" text="No verified work yet" sub="Verified chores show up here." />
          ) : (
            <View style={s.list}>
              {verifiedFeed.map((e) => <WorkCard key={e.id} entry={e} showReactions />)}
            </View>
          )
        )}

        {segment === "pending" && (
          <>
            {awaitingMe.length > 0 && (
              <View style={s.banner}>
                <Ionicons name="notifications-outline" size={18} color={C.amber} />
                <Text style={s.bannerText}>
                  {awaitingMe.length} submission{awaitingMe.length === 1 ? "" : "s"} need your validation
                </Text>
              </View>
            )}
            {pendingEntries.length === 0 ? (
              <EmptyBlock icon="hourglass-outline" text="Nothing pending" sub="All submissions have been resolved." />
            ) : (
              <View style={s.list}>
                {pendingEntries.map((e) => <WorkCard key={e.id} entry={e} />)}
              </View>
            )}
          </>
        )}

        {segment === "board" && <WorkLeaderboard groupId={activeGroupId} />}
      </ScrollView>

      <AddFab onPress={() => setAddVisible(true)} />
      <AddWorkModal visible={addVisible} onClose={() => setAddVisible(false)} groupId={activeGroupId} />
    </SafeAreaView>
  );
}

function EmptyBlock({ icon, text, sub }: { icon: string; text: string; sub: string }) {
  return (
    <View style={s.blockEmpty}>
      <Ionicons name={icon as any} size={40} color={C.textDim} />
      <Text style={s.emptyText}>{text}</Text>
      <Text style={s.emptySub}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title:       { color: C.text, fontSize: 24, fontWeight: "700" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 14 },
  headerBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.amber + "1a", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  headerBadgeText: { color: C.amber, fontSize: 12, fontWeight: "700" },

  pickerWrap:  { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  trigger:     { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  triggerText: { color: C.text, fontSize: 15, fontWeight: "600", flex: 1 },

  backdrop:    { flex: 1 },
  menu:        { position: "absolute", left: 16, right: 16, backgroundColor: C.bg2, borderRadius: 14, borderWidth: 1, borderColor: C.border2, paddingBottom: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 12, maxHeight: 360 },
  menuHeading: { color: C.textMid, fontSize: 12, fontWeight: "600", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  menuItem:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.border },
  menuFirst:   { borderTopWidth: 0 },
  menuText:    { color: C.text, fontSize: 15, flex: 1 },

  scroll:      { flex: 1 },
  content:     { padding: 16, gap: 12, paddingBottom: 96 },
  tileRow:     { flexDirection: "row", gap: 10 },
  tile:        { flex: 1, backgroundColor: C.card, borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: C.border, gap: 3 },
  tileValue:   { fontSize: 20, fontWeight: "700", letterSpacing: -0.5 },
  tileLabel:   { color: C.textMid, fontSize: 11 },
  segment:     { flexDirection: "row", backgroundColor: C.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: C.border, marginTop: 4 },
  segBtn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 9 },
  segBtnActive:{ backgroundColor: C.green + "1a" },
  segText:     { color: C.textMid, fontSize: 12, fontWeight: "600" },
  segDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: C.amber, position: "absolute", top: 6, right: 10 },
  list:        { gap: 10 },
  banner:      { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.amber + "14", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.amber + "33" },
  bannerText:  { color: C.amber, fontSize: 13, fontWeight: "600", flex: 1 },
  blockEmpty:  { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 48 },
  empty:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  emptyText:   { color: C.text, fontSize: 16, fontWeight: "600" },
  emptySub:    { color: C.textMid, fontSize: 13, textAlign: "center" },
});
