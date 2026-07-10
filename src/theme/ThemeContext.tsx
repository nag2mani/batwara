import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { applyTheme, ThemeMode } from "./colors";

const STORAGE_KEY = "batwara.themeMode";

export type ThemePreference = ThemeMode | "system";

type ThemeContextValue = {
  preference: ThemePreference; // what the user picked
  mode: ThemeMode; // the resolved palette actually in effect
  setPreference: (pref: ThemePreference) => void;
};

function resolveSystem(): ThemeMode {
  return Appearance.getColorScheme() === "light" ? "light" : "dark";
}

function resolve(pref: ThemePreference): ThemeMode {
  return pref === "system" ? resolveSystem() : pref;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: "dark",
  mode: "dark",
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("dark");
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [ready, setReady] = useState(false);

  const apply = useCallback((pref: ThemePreference) => {
    const resolved = resolve(pref);
    applyTheme(resolved); // mutate C before children re-render with the new mode
    setMode(resolved);
  }, []);

  // Load the persisted preference before first paint to avoid a flash.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (!alive) return;
      const pref: ThemePreference =
        saved === "light" || saved === "dark" || saved === "system" ? saved : "dark";
      setPreferenceState(pref);
      apply(pref);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [apply]);

  // While following the system, re-resolve when the OS appearance changes.
  useEffect(() => {
    if (preference !== "system") return;
    const sub = Appearance.addChangeListener(() => apply("system"));
    return () => sub.remove();
  }, [preference, apply]);

  const setPreference = useCallback(
    (pref: ThemePreference) => {
      setPreferenceState(pref);
      apply(pref);
      AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
    },
    [apply]
  );

  const value = useMemo(
    () => ({ preference, mode, setPreference }),
    [preference, mode, setPreference]
  );

  if (!ready) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Rebuilds a StyleSheet whenever the active (resolved) theme changes. Usage:
//   const makeStyles = () => StyleSheet.create({ ... C.bg ... });
//   const s = useThemedStyles(makeStyles);
export function useThemedStyles<T>(factory: () => T): T {
  const { mode } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, [mode]);
}
