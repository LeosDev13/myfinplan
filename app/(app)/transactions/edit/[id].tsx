import { useState, useEffect } from "react";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { View, Text, Switch, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Select } from "~/components/ui/select";
import { useAccounts } from "~/lib/database/accounts";
import { useCategoriesWithSubs } from "~/lib/database/categories";
import { useTransaction, useTransactionMutations } from "~/lib/database/transactions";
import type { TransactionType } from "~/lib/types";

const schema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Enter a valid amount"),
  account_id: z.string().min(1, "Account is required"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  merchant: z.string().optional(),
  note: z.string().optional(),
  tags: z.string().optional(),
  reimbursed: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

const TYPE_CONFIG: Record<TransactionType, { bg: string; border: string; color: string }> = {
  expense:  { bg: "rgba(239,68,68,0.15)",   border: "rgba(239,68,68,0.4)",   color: "#ef4444" },
  income:   { bg: "rgba(16,185,129,0.15)",  border: "rgba(16,185,129,0.4)",  color: "#10b981" },
  transfer: { bg: "rgba(59,130,246,0.15)",  border: "rgba(59,130,246,0.4)",  color: "#3b82f6" },
};

export default function EditTransactionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: transaction, isLoading } = useTransaction(id);
  const [type, setType] = useState<TransactionType>("expense");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategoriesWithSubs();
  const { update, remove } = useTransactionMutations();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: "",
      account_id: "",
      category: "",
      subcategory: "",
      merchant: "",
      note: "",
      tags: "",
      reimbursed: false,
    },
  });

  // Pre-populate form once transaction loads
  useEffect(() => {
    if (!transaction) return;
    setType(transaction.transaction_type as TransactionType);
    setSelectedDate(new Date(transaction.datetime));
    const tags = (() => {
      try { return (JSON.parse(transaction.tags) as string[]).join(", "); }
      catch { return transaction.tags ?? ""; }
    })();
    reset({
      amount: (transaction.amount_cents / 100).toFixed(2),
      account_id: transaction.account_id,
      category: transaction.category,
      subcategory: transaction.subcategory ?? "",
      merchant: transaction.merchant ?? "",
      note: transaction.note ?? "",
      tags,
      reimbursed: transaction.reimbursed === 1,
    });
  }, [transaction]);

  const selectedCategoryName = watch("category");
  const selectedCategory = categories.find((c) => c.name === selectedCategoryName);
  const hasSubcategories = (selectedCategory?.subcategories.length ?? 0) > 0;

  const selectedAccountId = watch("account_id");
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const dateLabel = transaction
    ? new Date(transaction.datetime).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "—";

  const onSubmit = async (data: FormData) => {
    if (!id) return;
    try {
      const amountCents = Math.round(parseFloat(data.amount) * 100);
      const tagsArray = data.tags
        ? data.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
        : [];
      await update(id, {
        account_id: data.account_id,
        transaction_type: type,
        category: data.category,
        subcategory: data.subcategory || null,
        amount_cents: amountCents,
        currency: selectedAccount?.currency ?? transaction?.currency ?? "EUR",
        note: data.note || null,
        merchant: data.merchant || null,
        datetime: selectedDate.toISOString(),
        tags: JSON.stringify(tagsArray),
        reimbursed: data.reimbursed ? 1 : 0,
      });
      router.back();
    } catch (e: unknown) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("transactions.notReady"));
    }
  };

  const handleDelete = () => {
    Alert.alert(t("transactions.delete.title"), t("transactions.delete.confirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await remove(id);
            router.back();
          } catch (e: unknown) {
            Alert.alert(t("common.error"), e instanceof Error ? e.message : t("transactions.notReady"));
          }
        },
      },
    ]);
  };

  const accountOptions = accounts.map((a) => ({ label: a.name, value: a.id }));
  const categoryOptions = categories.map((c) => ({ label: c.name, value: c.name }));
  const subcategoryOptions =
    selectedCategory?.subcategories.map((s) => ({ label: s.name, value: s.name })) ?? [];

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#525252" }}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#525252" }}>{t("transactions.notFound")}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#0a0a0a" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "700" }}>
            {t("transactions.edit")}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32,
          gap: 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type toggle */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["expense", "income", "transfer"] as TransactionType[]).map((txType) => {
            const isActive = type === txType;
            const cfg = TYPE_CONFIG[txType];
            return (
              <TouchableOpacity
                key={txType}
                onPress={() => setType(txType)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  alignItems: "center",
                  backgroundColor: isActive ? cfg.bg : "transparent",
                  borderWidth: 1,
                  borderColor: isActive ? cfg.border : "#1f1f1f",
                }}
              >
                <Text
                  style={{
                    color: isActive ? cfg.color : "#525252",
                    fontSize: 12,
                    fontWeight: "700",
                    textTransform: "capitalize",
                  }}
                >
                  {t(`transactions.type.${txType}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Date picker */}
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 }}
        >
          <Text style={{ color: "#525252", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 }}>
            {t("transactions.fields.date")}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "600" }}>
              {selectedDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </Text>
            <Ionicons name="calendar-outline" size={14} color="#525252" />
          </View>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="spinner"
            onChange={(_: DateTimePickerEvent, date?: Date) => {
              setShowDatePicker(false);
              if (date) setSelectedDate(date);
            }}
          />
        )}

        {/* Amount */}
        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t("transactions.fields.amount")}
              placeholder="0.00"
              keyboardType="decimal-pad"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.amount?.message}
            />
          )}
        />

        {/* Account */}
        <Controller
          control={control}
          name="account_id"
          render={({ field: { onChange, value } }) => (
            <Select
              label={t("transactions.fields.account")}
              options={accountOptions}
              value={value}
              onChange={onChange}
              error={errors.account_id?.message}
            />
          )}
        />

        {/* Category */}
        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, value } }) => (
            <Select
              label={t("transactions.fields.category")}
              options={categoryOptions}
              value={value}
              onChange={(v) => { onChange(v); setValue("subcategory", ""); }}
              error={errors.category?.message}
            />
          )}
        />

        {/* Subcategory */}
        {hasSubcategories && (
          <Controller
            control={control}
            name="subcategory"
            render={({ field: { onChange, value } }) => (
              <Select
                label={t("transactions.fields.subcategory")}
                options={subcategoryOptions}
                value={value ?? ""}
                onChange={onChange}
              />
            )}
          />
        )}

        {/* Merchant */}
        <Controller
          control={control}
          name="merchant"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t("transactions.fields.merchant")}
              placeholder={t("transactions.fields.merchantPlaceholder")}
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
            />
          )}
        />

        {/* Note */}
        <Controller
          control={control}
          name="note"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t("transactions.fields.note")}
              placeholder={t("transactions.fields.notePlaceholder")}
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
            />
          )}
        />

        {/* Tags */}
        <Controller
          control={control}
          name="tags"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t("transactions.fields.tags")}
              placeholder={t("transactions.fields.tagsPlaceholder")}
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
            />
          )}
        />

        {/* Reimbursed */}
        <Controller
          control={control}
          name="reimbursed"
          render={({ field: { onChange, value } }) => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 4,
                opacity: type === "expense" ? 1 : 0,
              }}
              pointerEvents={type === "expense" ? "auto" : "none"}
            >
              <View>
                <Text style={{ color: "#525252", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 }}>
                  {t("transactions.fields.reimbursed")}
                </Text>
                <Text style={{ color: "#525252", fontSize: 12, marginTop: 2 }}>
                  {t("transactions.fields.reimbursedDesc")}
                </Text>
              </View>
              <Switch
                value={value ?? false}
                onValueChange={onChange}
                trackColor={{ false: "#1f1f1f", true: "#10b981" }}
                thumbColor="#ffffff"
              />
            </View>
          )}
        />

        <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting}>
          Save changes
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
