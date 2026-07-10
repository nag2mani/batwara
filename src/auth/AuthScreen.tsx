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
import { useThemedStyles } from "../theme/ThemeContext";

type Mode = "signin" | "signup" | "forgot";

export default function AuthScreen() {
  const s = useThemedStyles(makeStyles);
  const { signIn, signUp, sendPasswordReset, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [info, setInfo]         = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  // Password-recovery state
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode]         = useState("");

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
    setPassword("");
    setCode("");
    setCodeSent(false);
  }

  async function submit() {
    setError(null);
    setInfo(null);

    if (mode === "forgot") { await submitForgot(); return; }

    if (!email.trim() || !password.trim()) { setError("Email and password required"); return; }
    if (mode === "signup" && !name.trim()) { setError("Name required"); return; }
    setLoading(true);
    const err = mode === "signin"
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password, name.trim());
    setLoading(false);
    if (err) setError(err);
  }

  async function submitForgot() {
    if (!codeSent) {
      // Step 1: request a code
      if (!email.trim()) { setError("Enter your email"); return; }
      setLoading(true);
      const err = await sendPasswordReset(email.trim());
      setLoading(false);
      if (err) { setError(err); return; }
      setCodeSent(true);
      setInfo("We emailed you a code. Enter it below with your new password.");
      return;
    }
    // Step 2: verify code + set new password
    if (!code.trim()) { setError("Enter the code from your email"); return; }
    if (!password.trim()) { setError("Enter a new password"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    const err = await resetPassword(email.trim(), code.trim(), password);
    setLoading(false);
    if (err) setError(err);
    // On success the user is signed in automatically and this screen unmounts.
  }

  async function resendCode() {
    setError(null);
    setInfo(null);
    if (!email.trim()) { setError("Enter your email"); return; }
    setLoading(true);
    const err = await sendPasswordReset(email.trim());
    setLoading(false);
    if (err) { setError(err); return; }
    setInfo("We sent a new code to your email.");
  }

  const headings: Record<Mode, string> = {
    signin: "Welcome back",
    signup: "Create account",
    forgot: "Reset password",
  };
  const ctaLabel = mode === "signin" ? "Sign in"
    : mode === "signup" ? "Sign up"
    : codeSent ? "Reset password" : "Send code";

  return (
    <LinearGradient colors={[C.bg, C.bg2, C.bg3]} style={s.fill}>
      <KeyboardAvoidingView
        style={s.fill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <View style={s.logoWrap}>
            <Text style={s.logoIcon}>✦</Text>
            <Text style={s.logoText}>Batwara</Text>
            <Text style={s.tagline}>Split smarter, settle faster</Text>
          </View>

          <View style={s.card}>
            <Text style={s.heading}>{headings[mode]}</Text>

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
              editable={!(mode === "forgot" && codeSent)}
            />

            {/* Recovery code — only in the second step of the forgot flow */}
            {mode === "forgot" && codeSent && (
              <TextInput
                style={s.input}
                placeholder="Verification code"
                placeholderTextColor={C.textDim}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoCapitalize="none"
                maxLength={10}
              />
            )}

            {/* Password field: shown for sign in / sign up, and step 2 of forgot */}
            {(mode !== "forgot" || codeSent) && (
              <TextInput
                style={s.input}
                placeholder={mode === "forgot" ? "New password" : "Password"}
                placeholderTextColor={C.textDim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            )}

            {info && <Text style={s.infoText}>{info}</Text>}
            {error && <Text style={s.errorText}>{error}</Text>}

            <TouchableOpacity style={s.btn} onPress={submit} disabled={loading} activeOpacity={0.8}>
              {loading
                ? <ActivityIndicator color={C.bg} />
                : <Text style={s.btnText}>{ctaLabel}</Text>
              }
            </TouchableOpacity>

            {mode === "forgot" && codeSent && (
              <TouchableOpacity onPress={resendCode} disabled={loading}>
                <Text style={s.switchText}>Didn't get it? Resend code</Text>
              </TouchableOpacity>
            )}

            {mode === "signin" && (
              <TouchableOpacity onPress={() => switchMode("forgot")}>
                <Text style={s.switchText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={s.switchBtn}
              onPress={() => switchMode(
                mode === "signin" ? "signup"
                : mode === "signup" ? "signin"
                : "signin",
              )}
            >
              <Text style={s.switchText}>
                {mode === "signin" ? "No account? Sign up"
                  : mode === "signup" ? "Already have an account? Sign in"
                  : "Back to sign in"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const makeStyles = () => StyleSheet.create({
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
  infoText:  { color: C.green, fontSize: 13, marginBottom: 12, textAlign: "center", lineHeight: 18 },
  btn:       {
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 16,
    marginTop: 4,
  },
  btnText:   { color: C.bg, fontWeight: "700", fontSize: 16 },
  switchText:{ color: C.textMid, textAlign: "center", fontSize: 14, paddingVertical: 6 },
  switchBtn: { marginTop: 4 },
});
