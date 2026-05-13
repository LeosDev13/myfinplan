import { useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Animated,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAccounts, useAccountMutations } from "~/lib/database/accounts";
import type { AccountWithBalance } from "~/lib/types";

// ─── helpers ─────────────────────────────────────────────────
const formatCurrency = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(cents / 100);

// ─── swipeable row ───────────────────────────────────────────
function AccountRow({
  account,
  onEdit,
  onDelete,
}: {
  account: AccountWithBalance;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const { t } = useTranslation();
  const balance = account.balance_cents;
  const isPositive = balance >= 0;

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
      <Animated.View style={{ transform: [{ translateX }], flexDirection: "row" }}>
        <TouchableOpacity
          onPress={() => {
            swipeRef.current?.close();
            onDelete();
          }}
          style={{
            backgroundColor: "#ef4444",
            width: 80,
            alignItems: "center",
            justifyContent: "center",
            borderTopRightRadius: 12,
            borderBottomRightRadius: 12,
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
      <TouchableOpacity
        onPress={onEdit}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: "#141414",
          borderRadius: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "600" }}>
            {account.name}
          </Text>
          <Text style={{ color: "#525252", fontSize: 12, marginTop: 2 }}>
            {account.account_type === "shared" ? t("accounts.types.shared") : account.owner} · {account.currency}
          </Text>
        </View>
        <Text style={{ color: isPositive ? "#10b981" : "#ef4444", fontSize: 15, fontWeight: "700" }}>
          {formatCurrency(balance, account.currency)}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );
}

// ─── screen ──────────────────────────────────────────────────
export default function AccountsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { data: accounts, isLoading } = useAccounts();
  const { remove } = useAccountMutations();

  const handleDelete = (account: AccountWithBalance) => {
    Alert.alert(
      t("accounts.delete.title"),
      t("accounts.delete.message", { name: account.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.delete"), style: "destructive", onPress: () => remove(account.id) },
      ]
    );
  };

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
          {t("accounts.title")}
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(app)/more/accounts/add")}
          hitSlop={8}
        >
          <Ionicons name="add" size={26} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#525252" }}>{t("common.loading")}</Text>
        </View>
      ) : accounts.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ color: "#525252", fontSize: 16, fontWeight: "600", textAlign: "center" }}>
            {t("accounts.noAccounts")}
          </Text>
          <Text style={{ color: "#525252", fontSize: 13, marginTop: 4, textAlign: "center" }}>
            {t("accounts.noAccountsHint")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => (
            <AccountRow
              account={item}
              onEdit={() => router.push(`/(app)/more/accounts/edit/${item.id}`)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}
    </View>
  );
}
