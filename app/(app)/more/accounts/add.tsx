import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Select } from "~/components/ui/select";
import { useAccountMutations } from "~/lib/database/accounts";
import { useWorkspace } from "~/app/providers/WorkspaceProvider";
import type { AccountType } from "~/lib/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  account_type: z.enum(["personal", "shared"]),
  owner: z.string().min(1, "Owner is required"),
  currency: z.string().length(3, "Must be 3-letter code"),
  initial_balance: z.string().regex(/^-?\d+([.,]\d{1,2})?$/, "Invalid amount"),
});
type FormData = z.infer<typeof schema>;

const ACCOUNT_TYPE_OPTIONS: { label: string; value: AccountType }[] = [
  { label: "Personal", value: "personal" },
  { label: "Shared", value: "shared" },
];

export default function AddAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workspaceId } = useWorkspace();
  const { create } = useAccountMutations();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      account_type: "personal",
      currency: "EUR",
      initial_balance: "0",
      name: "",
      owner: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!workspaceId) return;
    const cents = Math.round(parseFloat(data.initial_balance.replace(",", ".")) * 100);
    await create(workspaceId, {
      name: data.name,
      account_type: data.account_type,
      owner: data.owner,
      currency: data.currency,
      initial_balance_cents: cents,
    });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "700" }}>
          New account
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32,
          gap: 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
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

        <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting}>
          Add account
        </Button>
      </ScrollView>
    </View>
  );
}
