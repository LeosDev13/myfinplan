import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Transaction, TransactionType } from "~/lib/types";

// ─── helpers ────────────────────────────────────────────────────────────────

export const TYPE_COLOR: Record<TransactionType, string> = {
  expense:  "#ef4444",
  income:   "#10b981",
  transfer: "#3b82f6",
};

export const TYPE_BG: Record<TransactionType, string> = {
  expense:  "rgba(239,68,68,0.12)",
  income:   "rgba(16,185,129,0.12)",
  transfer: "rgba(59,130,246,0.12)",
};

export const TYPE_PREFIX: Record<TransactionType, string> = {
  expense:  "-",
  income:   "+",
  transfer: "→",
};

export function formatAmount(amountCents: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency + " ";
  const value = (amountCents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${value}`;
}

// ─── row ────────────────────────────────────────────────────────────────────

export function TransactionRow({
  item,
  index,
  total,
  selected,
}: {
  item: Transaction;
  index: number;
  total: number;
  selected?: boolean;
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

      {/* Amount / Selected indicator */}
      {selected === true ? (
        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
      ) : selected === false ? (
        <Ionicons name="checkmark-circle-outline" size={20} color="#525252" />
      ) : (
        <Text style={{ color, fontSize: 14, fontWeight: "700" }}>
          {prefix}{formatAmount(item.amount_cents, item.currency)}
        </Text>
      )}
    </View>
  );
}
