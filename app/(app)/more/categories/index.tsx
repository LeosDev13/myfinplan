import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  useCategoriesWithSubs,
  useCategoryMutations,
  CategoryWithSubs,
} from "~/lib/database/categories";
import { Subcategory } from "~/lib/types";

// ─── subcategory row ─────────────────────────────────────────
function SubcategoryRow({
  sub,
  onDelete,
}: {
  sub: Subcategory;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center justify-between pl-6 pr-2 py-2.5 border-t border-border">
      <Text className="text-sm text-foreground flex-1">{sub.name}</Text>
      {sub.is_built_in === 0 && (
        <TouchableOpacity onPress={onDelete} className="px-2 py-1">
          <Text className="text-destructive text-sm">{t("common.delete")}</Text>
        </TouchableOpacity>
      )}
      {sub.is_built_in === 1 && (
        <Text className="text-xs text-muted-foreground px-2">built-in</Text>
      )}
    </View>
  );
}

// ─── category row ────────────────────────────────────────────
function CategoryRow({
  category,
  expanded,
  onToggle,
  onDelete,
  onAddSub,
  onDeleteSub,
}: {
  category: CategoryWithSubs;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onAddSub: () => void;
  onDeleteSub: (sub: Subcategory) => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Category header */}
      <TouchableOpacity
        onPress={onToggle}
        className="flex-row items-center justify-between px-4 py-3.5"
      >
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-sm text-muted-foreground">{expanded ? "▼" : "▶"}</Text>
          <Text className="text-base font-semibold text-foreground">{category.name}</Text>
          {category.is_built_in === 1 && (
            <Text className="text-xs text-muted-foreground">(built-in)</Text>
          )}
        </View>
        <Text className="text-xs text-muted-foreground mr-2">
          {category.subcategories.length} sub
        </Text>
        {category.is_built_in === 0 && (
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-destructive text-sm">{t("common.delete")}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Expanded: subcategories + add button */}
      {expanded && (
        <>
          {category.subcategories.map((sub) => (
            <SubcategoryRow
              key={sub.id}
              sub={sub}
              onDelete={() => onDeleteSub(sub)}
            />
          ))}
          <TouchableOpacity
            onPress={onAddSub}
            className="flex-row items-center gap-2 pl-6 pr-4 py-2.5 border-t border-border"
          >
            <Text className="text-sm text-primary font-medium">+ {t("categories.saveSub")}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ─── screen ──────────────────────────────────────────────────
export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { data: categories, isLoading } = useCategoriesWithSubs();
  const { deleteCategory, deleteSubcategory } = useCategoryMutations();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDeleteCategory = async (category: CategoryWithSubs) => {
    Alert.alert(
      t("categories.delete.title"),
      t("categories.delete.message", { name: category.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            const result = await deleteCategory(category.id, category.name);
            if (result === "has_transactions") {
              Alert.alert(
                t("common.error"),
                t("categories.delete.hasTransactions")
              );
            }
          },
        },
      ]
    );
  };

  const handleDeleteSubcategory = (sub: Subcategory) => {
    Alert.alert(
      t("categories.delete.title"),
      t("categories.delete.message", { name: sub.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => deleteSubcategory(sub.id),
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top + 12, paddingBottom: 12, paddingHorizontal: 16 }}
        className="flex-row items-center gap-3"
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="flex-1 text-2xl font-bold text-foreground">{t("categories.title")}</Text>
        <TouchableOpacity
          onPress={() => router.push("/(app)/more/categories/add")}
          className="bg-primary rounded-full w-9 h-9 items-center justify-center"
        >
          <Text className="text-primary-foreground text-xl leading-none">+</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">{t("common.loading")}</Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-4 gap-3 pb-10">
          {categories.map((cat) => (
            <CategoryRow
              key={cat.id}
              category={cat}
              expanded={expanded.has(cat.id)}
              onToggle={() => toggleExpand(cat.id)}
              onDelete={() => handleDeleteCategory(cat)}
              onAddSub={() => router.push(`/(app)/more/categories/${cat.id}/add-sub`)}
              onDeleteSub={handleDeleteSubcategory}
            />
          ))}

          {categories.length === 0 && (
            <View className="mt-20 items-center">
              <Text className="text-muted-foreground text-center">
                {t("categories.noCategories")}{"\n"}{t("categories.noCategoriesHint")}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
