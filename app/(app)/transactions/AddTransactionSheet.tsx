import { useState } from "react";
import { View, Text, Switch, TouchableOpacity } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sheet } from "~/components/ui/sheet";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Select } from "~/components/ui/select";
import { useAccounts } from "~/lib/database/accounts";
import { useCategoriesWithSubs } from "~/lib/database/categories";
import { useTransactionMutations } from "~/lib/database/transactions";
import { useWorkspace } from "~/app/providers/WorkspaceProvider";
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

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AddTransactionSheet({ visible, onClose }: Props) {
  const [type, setType] = useState<TransactionType>("expense");
  const { workspaceId } = useWorkspace();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategoriesWithSubs();
  const { create } = useTransactionMutations();

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

  const selectedCategoryName = watch("category");
  const selectedCategory = categories.find((c) => c.name === selectedCategoryName);
  const hasSubcategories = (selectedCategory?.subcategories.length ?? 0) > 0;

  const selectedAccountId = watch("account_id");
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const dateLabel = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const onSubmit = async (data: FormData) => {
    if (!workspaceId) return;
    const amountCents = Math.round(parseFloat(data.amount) * 100);
    const tagsArray = data.tags
      ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    await create(workspaceId, {
      account_id: data.account_id,
      transaction_type: type,
      category: data.category,
      subcategory: data.subcategory || null,
      amount_cents: amountCents,
      currency: selectedAccount?.currency ?? "EUR",
      note: data.note || null,
      merchant: data.merchant || null,
      datetime: new Date().toISOString(),
      tags: JSON.stringify(tagsArray),
      reimbursed: data.reimbursed ? 1 : 0,
    });

    reset();
    setType("expense");
    onClose();
  };

  const accountOptions = accounts.map((a) => ({ label: a.name, value: a.id }));
  const categoryOptions = categories.map((c) => ({ label: c.name, value: c.name }));
  const subcategoryOptions =
    selectedCategory?.subcategories.map((s) => ({ label: s.name, value: s.name })) ?? [];

  return (
    <Sheet visible={visible} onClose={onClose} title="Add transaction">
      <View className="gap-5 pb-4">

        {/* Type toggle */}
        <View className="flex-row gap-2">
          {(["expense", "income", "transfer"] as TransactionType[]).map((t) => {
            const isActive = type === t;
            const cfg = TYPE_CONFIG[t];
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
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
                  {t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Date (read-only, defaults to today) */}
        <View className="flex-row items-center justify-between px-1">
          <Text className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Date
          </Text>
          <Text className="text-sm font-semibold text-foreground">{dateLabel}</Text>
        </View>

        {/* Amount */}
        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Amount"
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
              label="Account"
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
              label="Category"
              options={categoryOptions}
              value={value}
              onChange={(v) => {
                onChange(v);
                setValue("subcategory", "");
              }}
              error={errors.category?.message}
            />
          )}
        />

        {/* Subcategory — only when selected category has subcategories */}
        {hasSubcategories && (
          <Controller
            control={control}
            name="subcategory"
            render={({ field: { onChange, value } }) => (
              <Select
                label="Subcategory"
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
              label="Merchant"
              placeholder="Who did you pay?"
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
              label="Note"
              placeholder="Optional memo"
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
              label="Tags"
              placeholder="groceries, weekend (comma-separated)"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
            />
          )}
        />

        {/* Reimbursed — always rendered to prevent height jump; hidden when not expense */}
        <Controller
          control={control}
          name="reimbursed"
          render={({ field: { onChange, value } }) => (
            <View
              className="flex-row items-center justify-between py-1"
              style={{ opacity: type === "expense" ? 1 : 0 }}
              pointerEvents={type === "expense" ? "auto" : "none"}
            >
              <View>
                <Text className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Reimbursed
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Mark as to be paid back
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

        {/* Save */}
        <Button
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          className="mt-2"
        >
          Save transaction
        </Button>

      </View>
    </Sheet>
  );
}
