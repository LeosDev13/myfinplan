import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import {
  useBudgets,
  useBudgetMutations,
  spendColor,
  spendProgress,
  spendPct,
} from "~/lib/database/budgets";
import { useWorkspace } from "~/app/providers/WorkspaceProvider";
import { Sheet } from "~/components/ui/sheet";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Select } from "~/components/ui/select";
import { ProgressRing } from "~/components/ui/ProgressRing";
import type { BudgetWithTotals } from "~/lib/types";

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function BudgetCard({
  budget,
  onPress,
}: {
  budget: BudgetWithTotals;
  onPress: () => void;
}) {
  const color    = spendColor(budget.spent_cents, budget.total_planned_cents);
  const progress = spendProgress(budget.spent_cents, budget.total_planned_cents);
  const pct      = spendPct(budget.spent_cents, budget.total_planned_cents);

  const eventDateLabel = budget.event_date
    ? new Date(budget.event_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : null;

  const moneyLabel = `${formatMoney(budget.spent_cents, budget.currency)} / ${formatMoney(
    budget.total_planned_cents,
    budget.currency
  )}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#141414",
        borderRadius: 16,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}
    >
      <ProgressRing
        size={52}
        strokeWidth={4}
        progress={progress}
        color={color}
        label={pct}
        labelSize={11}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700", marginBottom: 2 }}>
          {budget.name}
        </Text>
        <Text style={{ color: "#525252", fontSize: 11 }}>
          {[eventDateLabel, moneyLabel].filter(Boolean).join(" · ")}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function BudgetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const { data: budgets } = useBudgets(workspaceId ?? "");
  const { create } = useBudgetMutations();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [name, setName]           = useState("");
  const [currency, setCurrency]   = useState<"EUR" | "USD" | "GBP">("EUR");
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [notes, setNotes]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const resetForm = () => {
    setName(""); setCurrency("EUR"); setEventDate(null); setNotes(""); setError("");
  };

  const handleSave = async () => {
    if (!workspaceId || !name.trim()) return;
    setSaving(true);
    try {
      await create(workspaceId, {
        name: name.trim(),
        currency,
        event_date: eventDate ? eventDate.toISOString().split("T")[0] : null,
        notes: notes.trim() || null,
      });
      resetForm();
      setSheetVisible(false);
    } catch (e: any) {
      setError(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
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
          Budgets
        </Text>
        <TouchableOpacity onPress={() => setSheetVisible(true)} hitSlop={8}>
          <Ionicons name="add" size={26} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* List / empty state */}
      {budgets.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Text style={{ color: "#525252", fontSize: 16, fontWeight: "600" }}>No budgets yet</Text>
          <Text style={{ color: "#525252", fontSize: 13 }}>Tap + to create one</Text>
        </View>
      ) : (
        <FlatList
          data={budgets}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingBottom: insets.bottom + 16,
            gap: 10,
          }}
          renderItem={({ item }) => (
            <BudgetCard
              budget={item}
              onPress={() => router.push(`/budgets/${item.id}`)}
            />
          )}
        />
      )}

      {/* Add budget sheet */}
      <Sheet
        visible={sheetVisible}
        onClose={() => { setSheetVisible(false); resetForm(); }}
        title="New budget"
      >
        <View className="gap-5 pb-4">
          <Input
            label="Name"
            placeholder="e.g. Summer Holiday"
            value={name}
            onChangeText={setName}
          />

          <Select
            label="Currency"
            options={[
              { label: "EUR €", value: "EUR" },
              { label: "USD $", value: "USD" },
              { label: "GBP £", value: "GBP" },
            ]}
            value={currency}
            onChange={setCurrency}
          />

          {/* Event date */}
          <View>
            <Text className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
              Event Date
            </Text>
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={{
                height: 52,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#1f1f1f",
                backgroundColor: "#0a0a0a",
                paddingHorizontal: 16,
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: eventDate ? "#ffffff" : "#525252",
                  fontSize: 15,
                  fontWeight: "500",
                }}
              >
                {eventDate
                  ? eventDate.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Optional"}
              </Text>
            </TouchableOpacity>
            {showPicker && (
              <DateTimePicker
                value={eventDate ?? new Date()}
                mode="date"
                display="spinner"
                onChange={(_: DateTimePickerEvent, date?: Date) => {
                  setShowPicker(false);
                  if (date) setEventDate(date);
                }}
              />
            )}
          </View>

          <Input
            label="Notes"
            placeholder="Optional"
            value={notes}
            onChangeText={setNotes}
          />

          {error ? (
            <Text style={{ color: "#ef4444", fontSize: 13 }}>{error}</Text>
          ) : null}

          <Button onPress={handleSave} loading={saving} disabled={!name.trim()}>
            Create budget
          </Button>
        </View>
      </Sheet>
    </View>
  );
}
