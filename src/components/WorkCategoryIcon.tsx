import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "./Icon";
import type { WorkCategory } from "../lib/types";
import { WORK_CATEGORY_META } from "../lib/types";
import { useThemedStyles } from "../theme/ThemeContext";

interface Props {
  category: WorkCategory;
  size?: number;
}

export default function WorkCategoryIcon({ category, size = 20 }: Props) {
  const s = useThemedStyles(makeStyles);
  const meta = WORK_CATEGORY_META[category];
  const boxSize = size + 16;
  return (
    <View style={[s.box, { width: boxSize, height: boxSize, borderRadius: boxSize / 2.5, backgroundColor: meta.soft }]}>
      <Ionicons name={meta.icon as any} size={size} color={meta.color} />
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
});
