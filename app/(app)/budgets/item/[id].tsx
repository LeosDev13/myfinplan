import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useBudgetItemWithSpend,
  useLinkedTransactions,
  useUnlinkedTransactions,
  useBudgetLinkMutations,
  spendColor,
  spendProgress,
  spendPct,
} from "~/lib/database/budgets";
import { useWorkspace } from "~/app/providers/WorkspaceProvider";
import { Sheet } from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { ProgressRing } from "~/components/ui/ProgressRing";
import { TransactionRow } from "~/app/(app)/transactions/TransactionRow";

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export default function BudgetItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId  = Array.isArray(id) ? id[0] : id;
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { workspaceId } = useWorkspace();

  const { data: item }              = useBudgetItemWithSpend(itemId);
  const { data: linkedTxns }        = useLinkedTransactions(itemId);
  const { data: unlinkedTxns }      = useUnlinkedTransactions(workspaceId ?? "", itemId);
  const { link }                    = useBudgetLinkMutations();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [linking, setLinking]             = useState(false);

  if (!item) return null;

  const color    = spendColor(item.spent_cents, item.planned_cents);
  const progress = spendProgress(item.spent_cents, item.planned_cents);
  const pct      = spendPct(item.spent_cents, item.planned_cents);
  const remaining = item.planned_cents - item.spent_cents;

  const toggleSelect = (txId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(txId) ? next.delete(txId) : next.add(txId);
      return next;
    });
  };

  const handleLink = async () => {
    setLinking(true);
    try {
      await Promise.all([...selected].map((txId) => link(itemId, txId)));
      setSelected(new Set());
      setPickerVisible(false);
    } finally {
      setLinking(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 8,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#10b981" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setPickerVisible(true)} hitSlop={8}>
          <Text style={{ color: "#10b981", fontSize: 14, fontWeight: "600" }}>Link txn</Text>
        </TouchableOpacity>
      </View>

      {/* Item name */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 }}>
          {item.name}
        </Text>
      </View>

      {/* Summary card */}
      <View
        style={{
          marginHorizontal: 12,
          marginBottom: 16,
          backgroundColor: "#141414",
          borderRadius: 16,
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ color, fontSize: 22, fontWeight: "800" }}>
            {formatMoney(item.spent_cents, item.currency)}
          </Text>
          <Text style={{ color: "#525252", fontSize: 11, marginTop: 2 }}>
            of {formatMoney(item.planned_cents, item.currency)} planned
          </Text>
          <Text style={{ color: "#525252", fontSize: 11, marginTop: 1 }}>
            {formatMoney(remaining, item.currency)} remaining
          </Text>
        </View>
        <ProgressRing
          size={52}
          strokeWidth={4}
          progress={progress}
          color={color}
          label={pct}
          labelSize={11}
        />
      </View>

      {/* Section header */}
      <Text
        style={{
          color: "#525252", fontSize: 10, fontWeight: "600",
          textTransform: "uppercase", letterSpacing: 1,
          paddingHorizontal: 16, paddingBottom: 8,
        }}
      >
        Linked transactions
      </Text>

      {/* Linked list */}
      {linkedTxns.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Text style={{ color: "#525252", fontSize: 14, fontWeight: "600" }}>
            No transactions linked yet
          </Text>
          <Text style={{ color: "#525252", fontSize: 12 }}>Tap "Link txn" to add one</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: insets.bottom + 16 }}
        >
          {linkedTxns.map((tx, index) => (
            <TransactionRow
              key={tx.id}
              item={tx}
              index={index}
              total={linkedTxns.length}
            />
          ))}
        </ScrollView>
      )}

      {/* Transaction picker sheet */}
      <Sheet
        visible={pickerVisible}
        onClose={() => { setPickerVisible(false); setSelected(new Set()); }}
        title="Link transactions"
      >
        <View className="gap-4 pb-4">
          {unlinkedTxns.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <Text style={{ color: "#525252", fontSize: 14 }}>
                All transactions already linked
              </Text>
            </View>
          ) : (
            <View>
              {unlinkedTxns.map((tx, index) => (
                <TouchableOpacity
                  key={tx.id}
                  onPress={() => toggleSelect(tx.id)}
                >
                  <TransactionRow
                    item={tx}
                    index={index}
                    total={unlinkedTxns.length}
                    selected={selected.has(tx.id)}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Button
            onPress={handleLink}
            loading={linking}
            disabled={selected.size === 0}
          >
            {selected.size === 0
              ? "Select transactions"
              : `Link ${selected.size} transaction${selected.size > 1 ? "s" : ""}`}
          </Button>
        </View>
      </Sheet>
    </View>
  );
}
