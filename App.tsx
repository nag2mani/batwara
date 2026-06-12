import "react-native-gesture-handler";
import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
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
  return (
    <GestureHandlerRootView style={s.fill}>
      <SafeAreaProvider>
        <StatusBar style="light" />
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
