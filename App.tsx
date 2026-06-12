import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import * as Font from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { StoreProvider } from "./src/store/StoreContext";
import AppNavigator from "./src/navigation/AppNavigator";
import AuthScreen from "./src/auth/AuthScreen";
import { isSupabaseConfigured } from "./src/lib/supabase";
import { C } from "./src/theme/colors";

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={C.green} size="large" />
      </View>
    );
  }

  // Local mode: auto signed-in, skip auth screen
  // Supabase mode: show auth screen if no session
  if (!user && isSupabaseConfigured) return <AuthScreen />;

  return (
    <StoreProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </StoreProvider>
  );
}

export default function App() {
  useEffect(() => {
    // Load Ionicons font in background — does not block render.
    // Icons appear as soon as the font is ready (~1 frame after mount).
    Font.loadAsync(Ionicons.font).catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={s.fill}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar backgroundColor={C.bg} barStyle="light-content" translucent={false} />
        <AuthProvider>
          <Root />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  fill:    { flex: 1 },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
});
