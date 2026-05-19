import { useRef } from "react";
import { View, Text, TouchableOpacity, SectionList, ScrollView, ActivityIndicator, Animated, Alert } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useState, useCallback } from "react";
import { useTransactions, useTransactionMutations } from "~/lib/database/transactions";
import { useAccounts } from "~/lib/database/accounts";
import { TransactionRow } from "./TransactionRow";
import type { Transaction } from "~/lib/types";

const PAGE_SIZE = 50;

function dateTitle(isoString: string, t: (k: string) => string): string {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return t("date.today");
  if (date.toDateString() === yesterday.toDateString()) return t("date.yesterday");
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

type Section = { title: string; data: Transaction[] };

function groupByDate(transactions: Transaction[], t: (k: string) => string): Section[] {
  const map = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = new Date(tx.datetime).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return Array.from(map.entries()).map(([, txs]) => ({
    title: dateTitle(txs[0].datetime, t),
    data: txs,
  }));
}

// ─── swipeable row ───────────────────────────────────────────────────────────

function SwipeableTransactionRow({
  item,
  index,
  total,
  onPress,
  onDelete,
  balanceAfterCents,
}: {
  item: Transaction;
  index: number;
  total: number;
  onPress: () => void;
  onDelete: () => void;
  balanceAfterCents?: number;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const { t } = useTranslation();

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: "clamp",
    });
    return (
      <Animated.View style={{ transform: [{ translateX }] }}>
        <TouchableOpacity
          onPress={() => {
            swipeRef.current?.close();
            onDelete();
          }}
          style={{
            backgroundColor: "#ef4444",
            width: 80,
            alignSelf: "stretch",
            alignItems: "center",
            justifyContent: "center",
            borderTopRightRadius: index === 0 ? 12 : 3,
            borderBottomRightRadius: index === total - 1 ? 12 : 3,
          }}
        >
          <Ionicons name="trash-outline" size={20} color="#ffffff" />
          <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "600", marginTop: 3 }}>
            {t("common.delete")}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
      <TouchableOpacity onPress={onPress}>
        <TransactionRow item={item} index={index} total={total} balanceAfterCents={balanceAfterCents} />
      </TouchableOpacity>
    </Swipeable>
  );
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const { data: accounts } = useAccounts();
  const { data: transactions, isLoading } = useTransactions(limit, selectedAccountId);
  const { remove } = useTransactionMutations();
  const sections = groupByDate(transactions, t);
  const hasMore = transactions.length === limit;

  // Running balance per transaction — only when filtered to one account
  const balanceMap = useCallback((): Map<string, number> => {
    if (!selectedAccountId) return new Map();
    const account = accounts.find((a) => a.id === selectedAccountId);
    if (!account) return new Map();

    const map = new Map<string, number>();
    // transactions are sorted DESC; walk forward to accumulate from current balance backwards
    let running = account.balance_cents;
    for (const tx of transactions) {
      map.set(tx.id, running);
      // undo this transaction's effect to get the balance before it
      if (tx.transaction_type === "income" && tx.account_id === selectedAccountId) {
        running -= tx.amount_cents;
      } else if (tx.transaction_type === "expense" && tx.account_id === selectedAccountId) {
        running += tx.amount_cents;
      } else if (tx.transaction_type === "transfer") {
        if (tx.account_id === selectedAccountId) running += tx.amount_cents;
        else if (tx.to_account_id === selectedAccountId) running -= tx.amount_cents;
      }
    }
    return map;
  }, [selectedAccountId, accounts, transactions])();

  const loadMore = useCallback(() => {
    if (hasMore) setLimit((l) => l + PAGE_SIZE);
  }, [hasMore]);

  const selectAccount = (id: string | null) => {
    setSelectedAccountId(id);
    setLimit(PAGE_SIZE);
  };

  const handleDelete = (item: Transaction) => {
    Alert.alert(t("transactions.delete.title"), t("transactions.delete.confirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => remove(item.id),
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
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
          {t("transactions.title")}
        </Text>
        <TouchableOpacity onPress={() => router.push("/(app)/transactions/add")} hitSlop={8}>
          <Ionicons name="add" size={26} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* Account filter pills */}
      {accounts.length > 1 && (
        <View style={{ paddingVertical: 4 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 4 }}
          >
            <TouchableOpacity
              onPress={() => selectAccount(null)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: selectedAccountId === null ? "#10b981" : "transparent",
                borderWidth: 1,
                borderColor: selectedAccountId === null ? "#10b981" : "#1f1f1f",
              }}
            >
              <Text
                style={{
                  color: selectedAccountId === null ? "#ffffff" : "#525252",
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {t("common.all")}
              </Text>
            </TouchableOpacity>
            {accounts.map((account) => {
              const isActive = selectedAccountId === account.id;
              return (
                <TouchableOpacity
                  key={account.id}
                  onPress={() => selectAccount(isActive ? null : account.id)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: isActive ? "#10b981" : "transparent",
                    borderWidth: 1,
                    borderColor: isActive ? "#10b981" : "#1f1f1f",
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? "#ffffff" : "#525252",
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {account.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#10b981" />
        </View>
      ) : sections.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Text style={{ color: "#525252", fontSize: 16, fontWeight: "600" }}>
            {t("transactions.noTransactions")}
          </Text>
          <Text style={{ color: "#525252", fontSize: 13 }}>
            {t("transactions.noTransactionsHint")}
          </Text>
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
            <SwipeableTransactionRow
              item={item}
              index={index}
              total={section.data.length}
              onPress={() => router.push(`/(app)/transactions/edit/${item.id}`)}
              onDelete={() => handleDelete(item)}
              balanceAfterCents={balanceMap.get(item.id)}
            />
          )}
          stickySectionHeadersEnabled={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            hasMore ? (
              <View style={{ paddingVertical: 16, alignItems: "center" }}>
                <ActivityIndicator color="#525252" size="small" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
