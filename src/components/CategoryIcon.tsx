import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Category } from "../lib/types";
import { CATEGORY_META } from "../lib/types";

const ICONS: Record<Category, keyof typeof Ionicons.glyphMap> = {
  Grocery:       "basket-outline",
  Rent:          "home-outline",
  Entertainment: "film-outline",
  Dining:        "restaurant-outline",
  Utilities:     "flash-outline",
  Others:        "ellipsis-horizontal-circle-outline",
};

interface Props {
  category: Category;
  size?: number;
}

export default function CategoryIcon({ category, size = 20 }: Props) {
  const meta = CATEGORY_META[category];
  const boxSize = size + 16;
  return (
    <View style={[s.box, { width: boxSize, height: boxSize, borderRadius: boxSize / 2.5, backgroundColor: meta.soft }]}>
      <Ionicons name={ICONS[category]} size={size} color={meta.color} />
    </View>
  );
}

const s = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
});
