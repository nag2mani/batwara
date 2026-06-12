import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "./AuthContext";
import { C } from "../theme/colors";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function submit() {
    setError(null);
    if (!email.trim() || !password.trim()) { setError("Email and password required"); return; }
    if (mode === "signup" && !name.trim()) { setError("Name required"); return; }
    setLoading(true);
    const err = mode === "signin"
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password, name.trim());
    setLoading(false);
    if (err) setError(err);
  }

  return (
    <LinearGradient colors={[C.bg, C.bg2, C.bg3]} style={s.fill}>
      <KeyboardAvoidingView
        style={s.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <View style={s.logoWrap}>
            <Text style={s.logoIcon}>✦</Text>
            <Text style={s.logoText}>Batwara</Text>
            <Text style={s.tagline}>Split smarter, settle faster</Text>
          </View>

          <View style={s.card}>
            <Text style={s.heading}>{mode === "signin" ? "Welcome back" : "Create account"}</Text>

            {mode === "signup" && (
              <TextInput
                style={s.input}
                placeholder="Your name"
                placeholderTextColor={C.textDim}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            )}

            <TextInput
              style={s.input}
              placeholder="Email"
              placeholderTextColor={C.textDim}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={s.input}
              placeholder="Password"
              placeholderTextColor={C.textDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error && <Text style={s.errorText}>{error}</Text>}

            <TouchableOpacity style={s.btn} onPress={submit} disabled={loading} activeOpacity={0.8}>
              {loading
                ? <ActivityIndicator color={C.bg} />
                : <Text style={s.btnText}>{mode === "signin" ? "Sign in" : "Sign up"}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setMode(m => m === "signin" ? "signup" : "signin"); setError(null); }}>
              <Text style={s.switchText}>
                {mode === "signin" ? "No account? Sign up" : "Already have an account? Sign in"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  fill:      { flex: 1 },
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  logoWrap:  { alignItems: "center", marginBottom: 40 },
  logoIcon:  { fontSize: 40, color: C.green, marginBottom: 8 },
  logoText:  { fontSize: 32, fontWeight: "700", color: C.text, letterSpacing: -0.5 },
  tagline:   { fontSize: 14, color: C.textMid, marginTop: 4 },
  card:      { backgroundColor: C.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border2 },
  heading:   { fontSize: 20, fontWeight: "600", color: C.text, marginBottom: 20 },
  input:     {
    backgroundColor: C.bg2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: C.text,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  errorText: { color: C.red, fontSize: 13, marginBottom: 12, textAlign: "center" },
  btn:       {
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 16,
    marginTop: 4,
  },
  btnText:   { color: C.bg, fontWeight: "700", fontSize: 16 },
  switchText:{ color: C.textMid, textAlign: "center", fontSize: 14 },
});
