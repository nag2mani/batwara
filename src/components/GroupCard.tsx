import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Group } from "../lib/types";
import { formatMoney } from "../lib/utils";
import { computeBalances, simplifyDebts, shareOf } from "../lib/splitwise";
import { useStore } from "../store/StoreContext";
import Avatar from "./Avatar";
import { C } from "../theme/colors";

interface Props {
  group: Group;
  onPress: () => void;
}

export default function GroupCard({ group, onPress }: Props) {
  const { data, memberById, meId } = useStore();

  const groupExpenses = data.expenses.filter(
    (e) => e.type === "group" && e.groupId === group.id,
  );
  const total = groupExpenses.reduce((s, e) => s + e.amount, 0);

  const balances  = computeBalances(data.expenses, data.settlements, group.id);
  const myBalance = balances.get(meId) ?? 0;
  const settled   = Math.abs(myBalance) < 0.01;
  const owes      = myBalance < 0;

  const members = group.memberIds
    .slice(0, 4)
    .map((id) => memberById.get(id))
    .filter(Boolean) as any[];

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
      <View style={s.header}>
        <Text style={s.emoji}>{group.emoji}</Text>
        <View style={s.badgeWrap}>
          {settled
            ? <View style={[s.badge, s.badgeGreen]}><Text style={[s.badgeText, { color: C.green }]}>Settled</Text></View>
            : <View style={[s.badge, owes ? s.badgeRed : s.badgePurple]}>
                <Text style={[s.badgeText, { color: owes ? C.red : C.purple }]}>
                  {owes ? `You owe ${formatMoney(Math.abs(myBalance))}` : `Get back ${formatMoney(myBalance)}`}
                </Text>
              </View>
          }
        </View>
      </View>

      <Text style={s.name}>{group.name}</Text>
      <Text style={s.total}>{formatMoney(total)} total</Text>

      <View style={s.avatars}>
        {members.map((m, i) => (
          <View key={m.id} style={[s.avatarWrap, { marginLeft: i === 0 ? 0 : -8, zIndex: members.length - i }]}>
            <Avatar name={m.name} color={m.color} size="sm" />
          </View>
        ))}
        {group.memberIds.length > 4 && (
          <View style={[s.avatarWrap, s.more]}>
            <Text style={s.moreText}>+{group.memberIds.length - 4}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card:       { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, gap: 6 },
  header:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  emoji:      { fontSize: 28 },
  badgeWrap:  { },
  badge:      { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeGreen: { backgroundColor: C.green + "1a" },
  badgeRed:   { backgroundColor: C.red + "1a" },
  badgePurple:{ backgroundColor: C.purple + "1a" },
  badgeText:  { fontSize: 11, fontWeight: "600" },
  name:       { color: C.text, fontSize: 16, fontWeight: "600" },
  total:      { color: C.textMid, fontSize: 13 },
  avatars:    { flexDirection: "row", marginTop: 8 },
  avatarWrap: { },
  more:       { width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg3, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  moreText:   { color: C.textMid, fontSize: 11, fontWeight: "600" },
});
