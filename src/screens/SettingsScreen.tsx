import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { useStore } from "../store/StoreContext";
import { formatMoney } from "../lib/utils";
import { C } from "../theme/colors";
import Avatar from "../components/Avatar";

export default function SettingsScreen() {
  const { user: authUser, signOut: authSignOut } = useAuth();
  const { data, memberById, meId } = useStore();

  const me = memberById.get(meId) ?? [...memberById.values()][0];
  const displayName = authUser?.displayName ?? "User";

  const totalExpenses = data.expenses.length;
  const totalGroups   = data.groups.length;
  const totalSpent    = data.expenses.reduce((s, e) => s + e.amount, 0);

  function confirmSignOut() {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: authSignOut },
    ]);
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Profile */}
        <View style={s.profile}>
          {me && <Avatar name={me.name} color={me.color} size="lg" />}
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{displayName}</Text>
            <Text style={s.profileEmail}>{authUser?.isLocal ? "Local mode (no Supabase)" : authUser?.email}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statValue}>{totalExpenses}</Text>
            <Text style={s.statLabel}>Expenses</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statValue}>{totalGroups}</Text>
            <Text style={s.statLabel}>Groups</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statValue}>{formatMoney(totalSpent)}</Text>
            <Text style={s.statLabel}>Total tracked</Text>
          </View>
        </View>

        {/* Quote */}
        <View style={s.quoteCard}>
          <Text style={s.quoteText}>"You have to spend money to make money."</Text>
        </View>

        {/* App info */}
        <View style={s.section}>
          <Row icon="server-outline"         label="Backend"  value="Supabase + PostgreSQL" />
          <Row icon="phone-portrait-outline" label="Platform" value="React Native (Expo)" />
          <Row icon="code-outline"           label="Version"  value="1.0.0" />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={s.signOutBtn} onPress={confirmSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={C.red} />
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>

        {/* Developer card */}
        <View style={s.devCard}>
          <Text style={s.devHeading}>Developed with love by</Text>
          <Text style={s.devName}>Nagmani Kumar</Text>
          <View style={s.devLinks}>
            <TouchableOpacity
              style={s.linkBtn}
              onPress={() => Linking.openURL("https://github.com/nag2mani")}
              activeOpacity={0.75}
            >
              <Ionicons name="logo-github" size={16} color={C.bg} />
              <Text style={s.linkText}>GitHub</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.linkBtn, s.linkBtnBlue]}
              onPress={() => Linking.openURL("https://www.linkedin.com/in/nag2mani/")}
              activeOpacity={0.75}
            >
              <Ionicons name="logo-linkedin" size={16} color={C.bg} />
              <Text style={s.linkText}>LinkedIn</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={rs.row}>
      <Ionicons name={icon as any} size={18} color={C.textMid} />
      <Text style={rs.label}>{label}</Text>
      <Text style={rs.value}>{value}</Text>
    </View>
  );
}

const rs = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 },
  label: { flex: 1, color: C.textMid, fontSize: 15 },
  value: { color: C.text, fontSize: 14 },
});

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.bg },
  content:      { padding: 20, gap: 16, paddingBottom: 40 },

  profile:      { flexDirection: "row", alignItems: "center", gap: 16, padding: 16, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  profileInfo:  { gap: 4 },
  profileName:  { color: C.text, fontSize: 18, fontWeight: "600" },
  profileEmail: { color: C.textMid, fontSize: 13 },

  statsRow:     { flexDirection: "row", backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16 },
  stat:         { flex: 1, alignItems: "center", gap: 4 },
  statValue:    { color: C.text, fontSize: 18, fontWeight: "700" },
  statLabel:    { color: C.textMid, fontSize: 12 },
  statDivider:  { width: 1, backgroundColor: C.border },

  quoteCard:    { backgroundColor: C.green + "12", borderRadius: 16, borderWidth: 1, borderColor: C.green + "33", padding: 18, alignItems: "center" },
  quoteText:    { color: C.green, fontSize: 18, fontStyle: "italic", textAlign: "center", lineHeight: 28 },

  section:      { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16 },

  devCard:      { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 20, alignItems: "center", gap: 6 },
  devHeading:   { color: C.textMid, fontSize: 13 },
  devName:      { color: C.text, fontSize: 17, fontWeight: "700", marginBottom: 4 },
  devLinks:     { flexDirection: "row", gap: 12, marginTop: 4 },
  linkBtn:      { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#24292e", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  linkBtnBlue:  { backgroundColor: "#0a66c2" },
  linkText:     { color: C.bg, fontWeight: "600", fontSize: 13 },

  signOutBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, backgroundColor: C.red + "1a", borderRadius: 16, borderWidth: 1, borderColor: C.red + "33" },
  signOutText:  { color: C.red, fontWeight: "700", fontSize: 16 },
});
