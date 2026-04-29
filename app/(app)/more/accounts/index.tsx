import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAccounts, useAccountMutations } from "~/lib/database/accounts";
import type { AccountWithBalance } from "~/lib/types";

// ─── helpers ────────────────────────────────────────────────
const formatCurrency = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(cents / 100);

// ─── account row ─────────────────────────────────────────────
function AccountRow({
  account,
  onEdit,
  onDelete,
}: {
  account: AccountWithBalance;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const balance = account.balance_cents;
  const isPositive = balance >= 0;

  return (
    <TouchableOpacity
      onPress={onEdit}
      onLongPress={onDelete}
      className="flex-row items-center justify-between px-4 py-4 bg-card rounded-xl border border-border"
    >
      <View className="flex-1">
        <Text className="text-base font-semibold text-foreground">{account.name}</Text>
        <Text className="text-sm text-muted-foreground mt-0.5">
          {account.account_type === "shared" ? "Shared" : account.owner} · {account.currency}
        </Text>
      </View>
      <Text className={`text-base font-semibold ${isPositive ? "text-green-600" : "text-destructive"}`}>
        {formatCurrency(balance, account.currency)}
      </Text>
    </TouchableOpacity>
  );
}

// ─── screen ──────────────────────────────────────────────────
export default function AccountsScreen() {
  const router = useRouter();
  const { data: accounts, isLoading } = useAccounts();
  const { remove } = useAccountMutations();

  const handleDelete = (account: AccountWithBalance) => {
    Alert.alert(
      "Delete account",
      `Delete "${account.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => remove(account.id),
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 pt-14 pb-4 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-foreground">Accounts</Text>
        <TouchableOpacity
          onPress={() => router.push("/(app)/more/accounts/add")}
          className="bg-primary rounded-full w-9 h-9 items-center justify-center"
        >
          <Text className="text-primary-foreground text-xl leading-none">+</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading...</Text>
        </View>
      ) : accounts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-muted-foreground text-center text-base">
            No accounts yet.{"\n"}Tap + to add your first account.
          </Text>
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 gap-3 pb-8"
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
