import { useState } from "react";
import { View, Text, TouchableOpacity, SectionList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTransactions } from "~/lib/database/transactions";
import { AddTransactionSheet } from "./AddTransactionSheet";
import type { Transaction, TransactionType } from "~/lib/types";

// ─── helpers ────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<TransactionType, string> = {
  expense:  "#ef4444",
  income:   "#10b981",
  transfer: "#3b82f6",
};

const TYPE_BG: Record<TransactionType, string> = {
  expense:  "rgba(239,68,68,0.12)",
  income:   "rgba(16,185,129,0.12)",
  transfer: "rgba(59,130,246,0.12)",
};

const TYPE_PREFIX: Record<TransactionType, string> = {
  expense:  "-",
  income:   "+",
  transfer: "→",
};

function formatAmount(cents: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency + " ";
  const value = (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${value}`;
}

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

// ─── row ────────────────────────────────────────────────────────────────────

function TransactionRow({
  item,
  index,
  total,
}: {
  item: Transaction;
  index: number;
  total: number;
}) {
  const type = item.transaction_type as TransactionType;
  const color = TYPE_COLOR[type] ?? "#ffffff";
  const bg = TYPE_BG[type] ?? "transparent";
  const prefix = TYPE_PREFIX[type] ?? "";
  const letter = (item.category?.[0] ?? "?").toUpperCase();

  const isFirst = index === 0;
  const isLast = index === total - 1;
  const borderRadiusStyle = {
    borderTopLeftRadius: isFirst ? 12 : 3,
    borderTopRightRadius: isFirst ? 12 : 3,
    borderBottomLeftRadius: isLast ? 12 : 3,
    borderBottomRightRadius: isLast ? 12 : 3,
  };

  return (
    <View
      style={[
        {
          backgroundColor: "#141414",
          padding: 12,
          marginBottom: isLast ? 0 : 2,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        },
        borderRadiusStyle,
      ]}
    >
      {/* Icon */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color, fontSize: 14, fontWeight: "700" }}>{letter}</Text>
      </View>

      {/* Details */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "600" }}>
          {item.merchant || item.category}
        </Text>
        <Text
          style={{
            color: "#525252",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginTop: 1,
          }}
        >
          {item.category}
        </Text>
      </View>

      {/* Amount */}
      <Text style={{ color, fontSize: 14, fontWeight: "700" }}>
        {prefix}{formatAmount(item.amount_cents, item.currency)}
      </Text>
    </View>
  );
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
