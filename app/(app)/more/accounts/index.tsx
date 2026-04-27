import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAccounts, useAccountMutations } from "~/lib/database/accounts";
import { useWorkspace } from "~/app/providers/WorkspaceProvider";
import { AccountWithBalance, AccountType } from "~/lib/types";
import { Sheet } from "~/components/ui/sheet";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Select } from "~/components/ui/select";

// ─── helpers ────────────────────────────────────────────────
const formatCurrency = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(cents / 100);

// ─── form schema ────────────────────────────────────────────
const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  account_type: z.enum(["personal", "shared"]),
  owner: z.string().min(1, "Owner is required"),
  currency: z.string().length(3, "Must be 3-letter code"),
  initial_balance: z.string().regex(/^-?\d+([.,]\d{1,2})?$/, "Invalid amount"),
});
type AccountFormData = z.infer<typeof accountSchema>;

const ACCOUNT_TYPE_OPTIONS: { label: string; value: AccountType }[] = [
  { label: "Personal", value: "personal" },
  { label: "Shared", value: "shared" },
];

// ─── account form ────────────────────────────────────────────
function AccountForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Partial<AccountFormData>;
  onSubmit: (data: AccountFormData) => Promise<void>;
  submitLabel: string;
}) {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      account_type: "personal",
      currency: "EUR",
      initial_balance: "0",
      ...defaultValues,
    },
  });

  return (
    <View className="gap-4 pb-4">
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Account name"
            placeholder="e.g. BBVA Current"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.name?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="account_type"
        render={({ field: { onChange, value } }) => (
          <Select
            label="Type"
            options={ACCOUNT_TYPE_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.account_type?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="owner"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Owner"
            placeholder="e.g. Leo"
            autoCapitalize="words"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.owner?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="currency"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Currency"
            placeholder="EUR"
            autoCapitalize="characters"
            maxLength={3}
            onChangeText={(t) => onChange(t.toUpperCase())}
            onBlur={onBlur}
            value={value}
            error={errors.currency?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="initial_balance"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Initial balance"
            placeholder="0.00"
            keyboardType="decimal-pad"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.initial_balance?.message}
          />
        )}
      />

      <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting} className="mt-2">
        {submitLabel}
      </Button>
    </View>
  );
}

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
  const { data: accounts, isLoading } = useAccounts();
  const { workspaceId } = useWorkspace();
  const { create, update, remove } = useAccountMutations();

  const [addOpen, setAddOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<AccountWithBalance | null>(null);

  const parseCents = (value: string) =>
    Math.round(parseFloat(value.replace(",", ".")) * 100);

  const handleCreate = async (data: AccountFormData) => {
    if (!workspaceId) return;
    await create(workspaceId, {
      name: data.name,
      account_type: data.account_type,
      owner: data.owner,
      currency: data.currency,
      initial_balance_cents: parseCents(data.initial_balance),
    });
    setAddOpen(false);
  };

  const handleUpdate = async (data: AccountFormData) => {
    if (!editAccount) return;
    await update(editAccount.id, {
      name: data.name,
      initial_balance_cents: parseCents(data.initial_balance),
    });
    setEditAccount(null);
  };

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
          onPress={() => setAddOpen(true)}
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
              onEdit={() => setEditAccount(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      {/* Add sheet */}
      <Sheet visible={addOpen} onClose={() => setAddOpen(false)} title="New account">
        <AccountForm onSubmit={handleCreate} submitLabel="Add account" />
      </Sheet>

      {/* Edit sheet */}
      <Sheet
        visible={!!editAccount}
        onClose={() => setEditAccount(null)}
        title="Edit account"
      >
        {editAccount && (
          <AccountForm
            defaultValues={{
              name: editAccount.name,
              account_type: editAccount.account_type,
              owner: editAccount.owner,
              currency: editAccount.currency,
              initial_balance: (editAccount.initial_balance_cents / 100).toString(),
            }}
            onSubmit={handleUpdate}
            submitLabel="Save changes"
          />
        )}
      </Sheet>
    </View>
  );
}
