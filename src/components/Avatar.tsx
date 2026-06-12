import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { initials } from "../lib/utils";
import { C } from "../theme/colors";

interface Props {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = { sm: 28, md: 36, lg: 48 };
const FONT  = { sm: 11, md: 14, lg: 18 };

export default function Avatar({ name, color, size = "md" }: Props) {
  const dim = SIZES[size];
  return (
    <View style={[s.circle, { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: color + "26" }]}>
      <Text style={[s.text, { color, fontSize: FONT[size] }]}>{initials(name)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  text:   { fontWeight: "700" },
});
