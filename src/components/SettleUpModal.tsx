import React from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "./Icon";
import { computeBalances, simplifyDebts } from "../lib/splitwise";
import { lendingPerspective, lendingInvolvesMe } from "../lib/lending";
import { useStore } from "../store/StoreContext";
import { formatMoney, todayISO, uid } from "../lib/utils";
import { C } from "../theme/colors";
import Avatar from "./Avatar";

interface Props {
  visible: boolean;
  onClose: () => void;
  groupId?: string;
}

export default function SettleUpModal({ visible, onClose, groupId }: Props) {
  const { data, dispatch, memberById, meId } = useStore();

  const balances = computeBalances(data.expenses, data.settlements, groupId);
  const debts    = simplifyDebts(balances);

  // Outstanding loans involving me — only in the global (dashboard) view;
  // loans aren't tied to a group, so hide them in group-scoped settle up.
  const loans = groupId
    ? []
    : data.lendings.filter((l) => !l.settledAt && lendingInvolvesMe(l, meId));

  const nothingToSettle = debts.length === 0 && loans.length === 0;

  function settle(from: string, to: string, amount: number) {
    dispatch({
      type: "ADD_SETTLEMENT",
      settlement: { id: uid("s"), from, to, amount, date: todayISO(), groupId },
    });
  }

  function settleLoan(id: string) {
    dispatch({ type: "SET_LENDING_SETTLED", id, settledAt: todayISO() });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Settle up</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={C.textMid} />
          </TouchableOpacity>
        </View>

        {nothingToSettle ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🎉</Text>
            <Text style={s.emptyText}>All settled!</Text>
            <Text style={s.emptySubtext}>No outstanding balances</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Group / expense debts */}
            {debts.length > 0 && (
              <>
                {loans.length > 0 && <Text style={s.sectionLabel}>Expenses</Text>}
                {debts.map((debt, i) => {
                  const fromMember = memberById.get(debt.from);
                  const toMember   = memberById.get(debt.to);
                  if (!fromMember || !toMember) return null;
                  return (
                    <View key={i} style={s.debtRow}>
                      <Avatar name={fromMember.name} color={fromMember.color} size="md" />
                      <View style={s.debtInfo}>
                        <Text style={s.debtText}>
                          <Text style={{ color: fromMember.color }}>{fromMember.name}</Text>
                          {" owes "}
                          <Text style={{ color: toMember.color }}>{toMember.name}</Text>
                        </Text>
                        <Text style={s.debtAmount}>{formatMoney(debt.amount)}</Text>
                      </View>
                      <TouchableOpacity
                        style={s.settleBtn}
                        onPress={() => settle(debt.from, debt.to, debt.amount)}
                        activeOpacity={0.8}
                      >
                        <Text style={s.settleBtnText}>Settle</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </>
            )}

            {/* Loans (lent / borrowed) */}
            {loans.length > 0 && (
              <>
                <Text style={s.sectionLabel}>Loans</Text>
                {loans.map((l) => {
                  const { otherName: other, theyOweMe, otherColor: oc } = lendingPerspective(l, meId, memberById);
                  const otherColor = oc ?? C.amber;
                  return (
                    <View key={l.id} style={s.debtRow}>
                      <Avatar name={other} color={otherColor} size="md" />
                      <View style={s.debtInfo}>
                        <Text style={s.debtText}>
                          {theyOweMe
                            ? <><Text style={{ color: otherColor }}>{other}</Text>{" owes you"}</>
                            : <>{"You owe "}<Text style={{ color: otherColor }}>{other}</Text></>}
                        </Text>
                        <Text style={s.debtAmount}>{formatMoney(l.amount)}</Text>
                      </View>
                      <TouchableOpacity
                        style={s.settleBtn}
                        onPress={() => settleLoan(l.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={s.settleBtnText}>Settle</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg, padding: 20 },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title:       { color: C.text, fontSize: 20, fontWeight: "700" },
  sectionLabel:{ color: C.textMid, fontSize: 13, fontWeight: "600", marginTop: 16, marginBottom: 4 },
  empty:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyIcon:   { fontSize: 48 },
  emptyText:   { color: C.text, fontSize: 20, fontWeight: "600" },
  emptySubtext:{ color: C.textMid, fontSize: 15 },
  debtRow:     { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  debtInfo:    { flex: 1, gap: 4 },
  debtText:    { color: C.textMid, fontSize: 14 },
  debtAmount:  { color: C.text, fontSize: 18, fontWeight: "700" },
  settleBtn:   { backgroundColor: C.green, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  settleBtnText:{ color: C.bg, fontWeight: "700", fontSize: 14 },
});
