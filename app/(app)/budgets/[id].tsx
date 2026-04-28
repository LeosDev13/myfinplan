import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useBudgetWithTotals,
  useBudgetItemsWithSpend,
  useBudgetItemMutations,
  spendColor,
  spendProgress,
  spendPct,
} from "~/lib/database/budgets";
import { Sheet } from "~/components/ui/sheet";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
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
  const { data: budget }  = useBudgetWithTotals(id);
  const { data: items }   = useBudgetItemsWithSpend(id);
  const { create }        = useBudgetItemMutations();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [itemName, setItemName]         = useState("");
  const [itemAmount, setItemAmount]     = useState("");
  const [saving, setSaving]             = useState(false);
  const [formError, setFormError]       = useState("");

  const resetForm = () => { setItemName(""); setItemAmount(""); setFormError(""); };

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
        <TouchableOpacity onPress={() => setSheetVisible(true)} hitSlop={8}>
          <Text style={{ color: "#10b981", fontSize: 14, fontWeight: "600" }}>+ Item</Text>
        </TouchableOpacity>
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
            { label: "Spent",   value: formatMoney(budget.spent_cents, budget.currency),         statColor: color },
            { label: "Left",    value: formatMoney(remaining, budget.currency),                  statColor: "#525252" },
            { label: "Planned", value: formatMoney(budget.total_planned_cents, budget.currency), statColor: "#525252" },
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
          <Text style={{ color: "#525252", fontSize: 14, fontWeight: "600" }}>No items yet</Text>
          <Text style={{ color: "#525252", fontSize: 12 }}>Tap + Item to add one</Text>
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

      {/* Add item sheet */}
      <Sheet
        visible={sheetVisible}
        onClose={() => { setSheetVisible(false); resetForm(); }}
        title="Add item"
      >
        <View className="gap-5 pb-4">
          <Input
            label="Name"
            placeholder="e.g. Flights"
            value={itemName}
            onChangeText={setItemName}
          />
          <Input
            label="Planned amount"
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
            Add item
          </Button>
        </View>
      </Sheet>
    </View>
  );
}
