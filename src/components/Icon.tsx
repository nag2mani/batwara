import React from "react";
import { Text, StyleProp, TextStyle } from "react-native";
import glyphMap from "@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json";

const GLYPHS = glyphMap as Record<string, number>;

type IconProps = {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

/**
 * Drop-in replacement for @expo/vector-icons' Ionicons.
 *
 * The stock component hides every glyph behind expo-font's loadAsync(), which
 * never resolves reliably in our release builds — leaving icons blank. Here we
 * render the glyph directly with fontFamily "Ionicons", which React Native
 * auto-registers from android/app/src/main/assets/fonts/Ionicons.ttf. No async
 * font loading, so icons always render.
 */
export function Ionicons({ name, size = 24, color, style }: IconProps) {
  const code = GLYPHS[name];
  const glyph = code != null ? String.fromCodePoint(code) : "";
  return (
    <Text
      allowFontScaling={false}
      style={[{ fontFamily: "Ionicons", fontSize: size, color }, style]}
    >
      {glyph}
    </Text>
  );
}

// Mirror @expo/vector-icons' static so callers can use `keyof typeof Ionicons.glyphMap`.
Ionicons.glyphMap = GLYPHS;

export default Ionicons;
