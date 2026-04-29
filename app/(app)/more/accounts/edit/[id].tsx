import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useAccounts, useAccountMutations } from "~/lib/database/accounts";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  initial_balance: z.string().regex(/^-?\d+([.,]\d{1,2})?$/, "Invalid amount"),
});
type FormData = z.infer<typeof schema>;

export default function EditAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: accounts } = useAccounts();
  const { update } = useAccountMutations();

  const account = accounts.find((a) => a.id === id);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: account?.name ?? "",
      initial_balance: account
        ? (account.initial_balance_cents / 100).toString()
        : "0",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!id) return;
    const cents = Math.round(parseFloat(data.initial_balance.replace(",", ".")) * 100);
    await update(id, {
      name: data.name,
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
          Edit account
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
          Save changes
        </Button>
      </ScrollView>
    </View>
  );
}
