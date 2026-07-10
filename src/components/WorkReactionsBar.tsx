import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { REACTION_EMOJIS, type ReactionEmoji } from "../lib/types";
import { useStore } from "../store/StoreContext";
import { uid, todayISO } from "../lib/utils";
import { C } from "../theme/colors";
import { useThemedStyles } from "../theme/ThemeContext";

export default function WorkReactionsBar({ workId }: { workId: string }) {
  const s = useThemedStyles(makeStyles);
  const { data, dispatch, meId } = useStore();
  const reactions = data.workReactions.filter((r) => r.workId === workId);

  function toggle(emoji: ReactionEmoji) {
    const mine = reactions.find((r) => r.userId === meId && r.emoji === emoji);
    if (mine) {
      dispatch({ type: "REMOVE_REACTION", workId, userId: meId, emoji });
    } else {
      dispatch({
        type: "ADD_REACTION",
        reaction: { id: uid("rx"), workId, userId: meId, emoji, createdAt: todayISO() },
      });
    }
  }

  return (
    <View style={s.row}>
      {REACTION_EMOJIS.map((emoji) => {
        const count = reactions.filter((r) => r.emoji === emoji).length;
        const mine  = reactions.some((r) => r.userId === meId && r.emoji === emoji);
        return (
          <TouchableOpacity
            key={emoji}
            style={[s.pill, mine && s.pillActive]}
            onPress={() => toggle(emoji)}
            activeOpacity={0.7}
          >
            <Text style={s.emoji}>{emoji}</Text>
            {count > 0 && <Text style={[s.count, mine && { color: C.green }]}>{count}</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  row:        { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill:       { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg2 },
  pillActive: { borderColor: C.green, backgroundColor: C.green + "1a" },
  emoji:      { fontSize: 14 },
  count:      { color: C.textMid, fontSize: 12, fontWeight: "700" },
});
