export type ThemeMode = "dark" | "light";

export type Palette = {
  bg: string;
  bg2: string;
  bg3: string;
  card: string;
  border: string;
  border2: string;
  text: string;
  textMid: string;
  textDim: string;
  green: string;
  purple: string;
  pink: string;
  amber: string;
  sky: string;
  red: string;
  emerald: string;
};

export const DARK: Palette = {
  bg:       "#08080c",
  bg2:      "#0d0d14",
  bg3:      "#13131e",
  card:     "#111118",
  border:   "rgba(255,255,255,0.07)",
  border2:  "rgba(255,255,255,0.12)",
  text:     "#f1f5f9",
  textMid:  "#94a3b8",
  textDim:  "#475569",
  green:    "#34d399",
  purple:   "#8b5cf6",
  pink:     "#f472b6",
  amber:    "#fbbf24",
  sky:      "#38bdf8",
  red:      "#f87171",
  emerald:  "#10b981",
};

export const LIGHT: Palette = {
  bg:       "#f8fafc",
  bg2:      "#f1f5f9",
  bg3:      "#e2e8f0",
  card:     "#ffffff",
  border:   "rgba(15,23,42,0.08)",
  border2:  "rgba(15,23,42,0.14)",
  text:     "#0f172a",
  textMid:  "#475569",
  textDim:  "#94a3b8",
  green:    "#059669",
  purple:   "#7c3aed",
  pink:     "#db2777",
  amber:    "#d97706",
  sky:      "#0284c7",
  red:      "#dc2626",
  emerald:  "#059669",
};

export const PALETTES: Record<ThemeMode, Palette> = { dark: DARK, light: LIGHT };

// `C` is a live, mutable palette. It keeps the SAME object identity across theme
// switches (we reassign its keys via applyTheme), so inline `C.xxx` reads pick up
// the new values on the next render. Module-level StyleSheet.create() calls capture
// values by value, so those are rebuilt via the useThemedStyles hook (see ThemeContext).
export const C: Palette = { ...DARK };

export function applyTheme(mode: ThemeMode) {
  Object.assign(C, PALETTES[mode]);
}

export const MEMBER_COLORS = [
  "#34d399", "#8b5cf6", "#f472b6", "#fbbf24",
  "#38bdf8", "#f87171", "#a78bfa", "#fb923c",
];
