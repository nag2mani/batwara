import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { C } from "../theme/colors";

export default function AddFab({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={s.fab} onPress={onPress} activeOpacity={0.85}>
      <Text style={s.plus}>+</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  plus: {
    color: C.bg,
    fontSize: 50,
    fontWeight: "700",
    textAlign: "center",
    includeFontPadding: false,
  },
});
