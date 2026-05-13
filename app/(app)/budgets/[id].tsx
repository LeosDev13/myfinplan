import { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  useBudgetWithTotals,
  useBudgetItemsWithSpend,
  useBudgetMutations,
  useBudgetItemMutations,
  spendColor,
  spendProgress,
  spendPct,
} from "~/lib/database/budgets";
import { Sheet } from "~/components/ui/sheet";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Select } from "~/components/ui/select";
import { ProgressRing } from "~/components/ui/ProgressRing";
import type { BudgetItemWithSpend } from "~/lib/types";

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function ItemRow({
  item,
  index,
  total,
  onPress,
}: {
  item: BudgetItemWithSpend;
  index: number;
  total: number;
  onPress: () => void;
}) {
  const color    = spendColor(item.spent_cents, item.planned_cents);
  const progress = spendProgress(item.spent_cents, item.planned_cents);
  const isFirst  = index === 0;
  const isLast   = index === total - 1;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#141414",
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: isLast ? 0 : 2,
        borderTopLeftRadius:     isFirst ? 12 : 3,
        borderTopRightRadius:    isFirst ? 12 : 3,
        borderBottomLeftRadius:  isLast  ? 12 : 3,
        borderBottomRightRadius: isLast  ? 12 : 3,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "600" }}>{item.name}</Text>
        <Text style={{ color, fontSize: 14, fontWeight: "700" }}>
          {formatMoney(item.spent_cents, item.currency)} / {formatMoney(item.planned_cents, item.currency)}
        </Text>
      </View>
      <View style={{ backgroundColor: "#1f1f1f", borderRadius: 3, height: 3 }}>
        <View
          style={{
            backgroundColor: color,
            borderRadius: 3,
            height: 3,
            width: `${Math.min(progress * 100, 100)}%` as any,
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function BudgetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { t }   = useTranslation();
  const { data: budget, isLoading } = useBudgetWithTotals(id);
  const { data: items }       = useBudgetItemsWithSpend(id);
  const { update: updateBudget, remove: removeBudget } = useBudgetMutations();
  const { create }            = useBudgetItemMutations();

  // Add item sheet
  const [sheetVisible, setSheetVisible] = useState(false);
  const [itemName, setItemName]         = useState("");
  const [itemAmount, setItemAmount]     = useState("");
  const [saving, setSaving]             = useState(false);
  const [formError, setFormError]       = useState("");

  // Edit budget sheet
  const [editVisible, setEditVisible]   = useState(false);
  const [editName, setEditName]         = useState("");
  const [editCurrency, setEditCurrency] = useState<"EUR" | "USD" | "GBP">("EUR");
  const [editNotes, setEditNotes]       = useState("");
  const [editSaving, setEditSaving]     = useState(false);
  const [editError, setEditError]       = useState("");

  const resetForm = () => { setItemName(""); setItemAmount(""); setFormError(""); };

  // Pre-fill edit form when budget loads
  useEffect(() => {
    if (!budget) return;
    setEditName(budget.name);
    setEditCurrency(budget.currency as "EUR" | "USD" | "GBP");
    setEditNotes(budget.notes ?? "");
  }, [budget]);

  const handleEditSave = async () => {
    if (!budget || !editName.trim()) return;
    setEditSaving(true);
    try {
      await updateBudget(budget.id, {
        name: editName.trim(),
        currency: editCurrency,
        event_date: budget.event_date,
        notes: editNotes.trim() || null,
      });
      setEditVisible(false);
      setEditError("");
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(t("budgets.delete.title"), t("budgets.delete.message", { name: budget?.name ?? "" }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          await removeBudget(id);
          router.back();
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!budget || !itemName.trim() || !itemAmount) return;
    const planned_cents = Math.round(parseFloat(itemAmount) * 100);
    if (isNaN(planned_cents) || planned_cents <= 0) {
      setFormError("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      await create(budget.id, { name: itemName.trim(), planned_cents });
      resetForm();
      setSheetVisible(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }
  if (!budget) return null;

  const color     = spendColor(budget.spent_cents, budget.total_planned_cents);
  const progress  = spendProgress(budget.spent_cents, budget.total_planned_cents);
  const pct       = spendPct(budget.spent_cents, budget.total_planned_cents);
  const remaining = budget.total_planned_cents - budget.spent_cents;

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 8,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#10b981" />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <TouchableOpacity onPress={() => setSheetVisible(true)} hitSlop={8}>
            <Text style={{ color: "#10b981", fontSize: 14, fontWeight: "600" }}>+ {t("budgets.items.add")}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEditVisible(true)} hitSlop={8}>
            <Ionicons name="pencil-outline" size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Budget name + date */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 }}>
          {budget.name}
        </Text>
        {budget.event_date ? (
          <Text
            style={{
              color: "#525252", fontSize: 11,
              textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2,
            }}
          >
            {new Date(budget.event_date).toLocaleDateString("en-GB", {
              month: "short",
              year: "numeric",
            })}
          </Text>
        ) : null}
      </View>

      {/* Summary ring */}
      <View style={{ alignItems: "center", paddingBottom: 20 }}>
        <ProgressRing
          size={100}
          strokeWidth={7}
          progress={progress}
          color={color}
          label={pct}
          labelSize={20}
        />
        <View style={{ flexDirection: "row", gap: 32, marginTop: 14 }}>
          {[
            { label: t("budgets.items.stats.spent"),   value: formatMoney(budget.spent_cents, budget.currency),         statColor: color },
            { label: t("budgets.items.stats.left"),    value: formatMoney(remaining, budget.currency),                  statColor: "#525252" },
            { label: t("budgets.items.stats.planned"), value: formatMoney(budget.total_planned_cents, budget.currency), statColor: "#525252" },
          ].map((stat) => (
            <View key={stat.label} style={{ alignItems: "center" }}>
              <Text style={{ color: stat.statColor, fontSize: 15, fontWeight: "700" }}>{stat.value}</Text>
              <Text
                style={{
                  color: "#525252", fontSize: 10,
                  textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2,
                }}
              >
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Items list */}
      {items.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Text style={{ color: "#525252", fontSize: 14, fontWeight: "600" }}>{t("budgets.items.title")}</Text>
          <Text style={{ color: "#525252", fontSize: 12 }}>{t("budgets.items.hint")}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: insets.bottom + 16 }}
          renderItem={({ item, index }) => (
            <ItemRow
              item={item}
              index={index}
              total={items.length}
              onPress={() => router.push(`/budgets/item/${item.id}`)}
            />
          )}
        />
      )}

      {/* Edit budget sheet */}
      <Sheet
        visible={editVisible}
        onClose={() => { setEditVisible(false); setEditError(""); }}
        title={t("budgets.edit")}
      >
        <View className="gap-5 pb-4">
          <Input label={t("budgets.fields.name")} placeholder={t("budgets.fields.namePlaceholder")} value={editName} onChangeText={setEditName} />
          <Select
            label={t("budgets.fields.currency")}
            options={[
              { label: "EUR €", value: "EUR" },
              { label: "USD $", value: "USD" },
              { label: "GBP £", value: "GBP" },
            ]}
            value={editCurrency}
            onChange={setEditCurrency}
          />
          <Input label={t("budgets.fields.notes")} placeholder={t("common.optional")} value={editNotes} onChangeText={setEditNotes} />
          {editError ? <Text style={{ color: "#ef4444", fontSize: 13 }}>{editError}</Text> : null}
          <Button onPress={handleEditSave} loading={editSaving} disabled={!editName.trim()}>
            {t("budgets.editSave")}
          </Button>
        </View>
      </Sheet>

      {/* Add item sheet */}
      <Sheet
        visible={sheetVisible}
        onClose={() => { setSheetVisible(false); resetForm(); }}
        title={t("budgets.items.add")}
      >
        <View className="gap-5 pb-4">
          <Input
            label={t("budgets.items.fields.name")}
            placeholder={t("budgets.items.fields.namePlaceholder")}
            value={itemName}
            onChangeText={setItemName}
          />
          <Input
            label={t("budgets.items.fields.amount")}
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={itemAmount}
            onChangeText={setItemAmount}
          />
          {formError ? (
            <Text style={{ color: "#ef4444", fontSize: 13 }}>{formError}</Text>
          ) : null}
          <Button
            onPress={handleSave}
            loading={saving}
            disabled={!itemName.trim() || !itemAmount}
          >
            {t("budgets.items.save")}
          </Button>
        </View>
      </Sheet>
    </View>
  );
}
