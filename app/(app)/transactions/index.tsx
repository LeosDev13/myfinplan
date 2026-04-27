import { useState } from "react";
import { View, Text, TouchableOpacity, SectionList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTransactions } from "~/lib/database/transactions";
import { AddTransactionSheet } from "./AddTransactionSheet";
import { TransactionRow } from "./TransactionRow";
import type { Transaction } from "~/lib/types";

// ─── helpers ────────────────────────────────────────────────────────────────

function dateTitle(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

type Section = { title: string; data: Transaction[] };

function groupByDate(transactions: Transaction[]): Section[] {
  const map = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = new Date(tx.datetime).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return Array.from(map.entries()).map(([, txs]) => ({
    title: dateTitle(txs[0].datetime),
    data: txs,
  }));
}

// ─── screen ─────────────────────────────────────────────────────────────────

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const [sheetVisible, setSheetVisible] = useState(false);
  const { data: transactions } = useTransactions();
  const sections = groupByDate(transactions);

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 }}>
          Activity
        </Text>
        <TouchableOpacity onPress={() => setSheetVisible(true)} hitSlop={8}>
          <Ionicons name="add" size={26} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* List */}
      {sections.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Text style={{ color: "#525252", fontSize: 16, fontWeight: "600" }}>No transactions yet</Text>
          <Text style={{ color: "#525252", fontSize: 13 }}>Tap + to add your first one</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: insets.bottom + 16 }}
          renderSectionHeader={({ section }) => (
            <Text
              style={{
                color: "#525252",
                fontSize: 10,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 1,
                paddingHorizontal: 4,
                paddingTop: 16,
                paddingBottom: 6,
              }}
            >
              {section.title}
            </Text>
          )}
          renderItem={({ item, index, section }) => (
            <TransactionRow item={item} index={index} total={section.data.length} />
          )}
          stickySectionHeadersEnabled={false}
        />
      )}

      <AddTransactionSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}
