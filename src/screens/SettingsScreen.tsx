import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "../components/Icon";
import { useAuth } from "../auth/AuthContext";
import { useStore } from "../store/StoreContext";
import { formatMoney } from "../lib/utils";
import { C } from "../theme/colors";
import Avatar from "../components/Avatar";
import SplitwiseImportModal from "../components/SplitwiseImportModal";

export default function SettingsScreen() {
  const { user: authUser, signOut: authSignOut } = useAuth();
  const { data, memberById, meId } = useStore();

  const me = memberById.get(meId) ?? [...memberById.values()][0];
  const displayName = authUser?.displayName ?? "User";
  const [importVisible, setImportVisible] = useState(false);

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

        <Text style={s.pageTitle}>Settings</Text>

        {/* Profile */}
        <View style={s.profile}>
          {me && <Avatar name={me.name} color={me.color} size="lg" />}
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{displayName}</Text>
            <Text style={s.profileEmail}>{authUser?.isLocal ? "Local mode (no Supabase)" : authUser?.email}</Text>
          </View>
        </View>

        {/* Activity */}
        <View style={s.group}>
          <Text style={s.sectionHeader}>Your activity</Text>
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
        </View>

        {/* Data */}
        <View style={s.group}>
          <Text style={s.sectionHeader}>Data</Text>
          <TouchableOpacity style={s.importBtn} onPress={() => setImportVisible(true)} activeOpacity={0.8}>
            <View style={s.importIcon}>
              <Ionicons name="download-outline" size={20} color={C.sky} />
            </View>
            <View style={s.importInfo}>
              <Text style={s.importTitle}>Import from Splitwise</Text>
              <Text style={s.importSub}>Create a group from a CSV export</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textDim} />
          </TouchableOpacity>
        </View>

        {/* About / Developer */}
        <View style={s.group}>
          <Text style={s.sectionHeader}>About</Text>
          <View style={s.devRow}>
            <Text style={s.devByText} numberOfLines={1}>
              Developed by <Text style={s.devName}>Nagmani Kumar</Text>
            </Text>
            <View style={s.devLinks}>
              <TouchableOpacity
                style={s.iconLink}
                onPress={() => Linking.openURL("https://github.com/nag2mani")}
                activeOpacity={0.75}
              >
                <Ionicons name="logo-github" size={18} color={C.bg} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.iconLink, s.linkBtnBlue]}
                onPress={() => Linking.openURL("https://www.linkedin.com/in/nag2mani/")}
                activeOpacity={0.75}
              >
                <Ionicons name="logo-linkedin" size={18} color={C.bg} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Account */}
        <View style={s.group}>
          <Text style={s.sectionHeader}>Account</Text>
          <View style={s.section}>
            <Row icon="code-outline" label="Version" value="1.0.0" />
          </View>
          <TouchableOpacity style={s.signOutBtn} onPress={confirmSignOut} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color={C.red} />
            <Text style={s.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.quoteFooter}>"You have to spend money to make money."</Text>

      </ScrollView>

      <SplitwiseImportModal visible={importVisible} onClose={() => setImportVisible(false)} />
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
  content:      { padding: 20, gap: 24, paddingBottom: 40 },

  pageTitle:    { color: C.text, fontSize: 28, fontWeight: "700", marginBottom: -8 },

  group:        { gap: 8 },
  sectionHeader:{ color: C.textDim, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginLeft: 4 },

  profile:      { flexDirection: "row", alignItems: "center", gap: 16, padding: 16, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  profileInfo:  { flex: 1, gap: 4 },
  profileName:  { color: C.text, fontSize: 18, fontWeight: "600" },
  profileEmail: { color: C.textMid, fontSize: 13 },

  statsRow:     { flexDirection: "row", backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16 },
  stat:         { flex: 1, alignItems: "center", gap: 4 },
  statValue:    { color: C.text, fontSize: 18, fontWeight: "700" },
  statLabel:    { color: C.textMid, fontSize: 12 },
  statDivider:  { width: 1, backgroundColor: C.border },

  section:      { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16 },

  quoteFooter:  { color: C.textDim, fontSize: 13, fontStyle: "italic", textAlign: "center", marginTop: 4 },

  devRow:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 14 },
  devByText:    { flex: 1, color: C.textMid, fontSize: 14 },
  devName:      { color: C.text, fontSize: 14, fontWeight: "700" },
  devLinks:     { flexDirection: "row", gap: 10 },
  iconLink:     { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#24292e" },
  linkBtnBlue:  { backgroundColor: "#0a66c2" },

  signOutBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, backgroundColor: C.red + "1a", borderRadius: 16, borderWidth: 1, borderColor: C.red + "33" },
  signOutText:  { color: C.red, fontWeight: "700", fontSize: 16 },

  importBtn:    { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  importIcon:   { width: 40, height: 40, borderRadius: 12, backgroundColor: C.sky + "18", alignItems: "center", justifyContent: "center" },
  importInfo:   { flex: 1, gap: 3 },
  importTitle:  { color: C.text, fontSize: 15, fontWeight: "600" },
  importSub:    { color: C.textMid, fontSize: 12 },
});
