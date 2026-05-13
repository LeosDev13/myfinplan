import { View, Text, TouchableOpacity, SectionList, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTransactions } from "~/lib/database/transactions";
import { TransactionRow } from "./TransactionRow";
import type { Transaction } from "~/lib/types";

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

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { data: transactions, isLoading } = useTransactions();
  const sections = groupByDate(transactions, t);

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
            <TouchableOpacity onPress={() => router.push(`/(app)/transactions/edit/${item.id}`)}>
              <TransactionRow item={item} index={index} total={section.data.length} />
            </TouchableOpacity>
          )}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}
