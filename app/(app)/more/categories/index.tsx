import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCategoriesWithSubs,
  useCategoryMutations,
  CategoryWithSubs,
} from "~/lib/database/categories";
import { useWorkspace } from "~/app/providers/WorkspaceProvider";
import { Subcategory } from "~/lib/types";
import { Sheet } from "~/components/ui/sheet";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

// ─── form ────────────────────────────────────────────────────
const nameSchema = z.object({ name: z.string().min(1, "Name is required") });
type NameForm = z.infer<typeof nameSchema>;

function NameInputForm({
  placeholder,
  onSubmit,
  submitLabel,
}: {
  placeholder: string;
  onSubmit: (data: NameForm) => Promise<void>;
  submitLabel: string;
}) {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
  });

  return (
    <View className="gap-4 pb-4">
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Name"
            placeholder={placeholder}
            autoCapitalize="words"
            autoFocus
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.name?.message}
          />
        )}
      />
      <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting}>
        {submitLabel}
      </Button>
    </View>
  );
}

// ─── subcategory row ─────────────────────────────────────────
function SubcategoryRow({
  sub,
  onDelete,
}: {
  sub: Subcategory;
  onDelete: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between pl-6 pr-2 py-2.5 border-t border-border">
      <Text className="text-sm text-foreground flex-1">{sub.name}</Text>
      {sub.is_built_in === 0 && (
        <TouchableOpacity onPress={onDelete} className="px-2 py-1">
          <Text className="text-destructive text-sm">Delete</Text>
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
            <Text className="text-destructive text-sm">Delete</Text>
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
            <Text className="text-sm text-primary font-medium">+ Add subcategory</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ─── screen ──────────────────────────────────────────────────
export default function CategoriesScreen() {
  const { data: categories, isLoading } = useCategoriesWithSubs();
  const { workspaceId } = useWorkspace();
  const { createCategory, deleteCategory, createSubcategory, deleteSubcategory } =
    useCategoryMutations();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [addSubTarget, setAddSubTarget] = useState<CategoryWithSubs | null>(null);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreateCategory = async (data: NameForm) => {
    if (!workspaceId) return;
    await createCategory(workspaceId, data.name);
    setAddCatOpen(false);
  };

  const handleDeleteCategory = async (category: CategoryWithSubs) => {
    Alert.alert(
      "Delete category",
      `Delete "${category.name}" and all its subcategories?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await deleteCategory(category.id, category.name);
            if (result === "has_transactions") {
              Alert.alert(
                "Cannot delete",
                `"${category.name}" is used by existing transactions. Remove or recategorise them first.`
              );
            }
          },
        },
      ]
    );
  };

  const handleCreateSubcategory = async (data: NameForm) => {
    if (!addSubTarget) return;
    await createSubcategory(addSubTarget.id, data.name);
    setAddSubTarget(null);
  };

  const handleDeleteSubcategory = (sub: Subcategory) => {
    Alert.alert(
      "Delete subcategory",
      `Delete "${sub.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteSubcategory(sub.id),
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 pt-14 pb-4 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-foreground">Categories</Text>
        <TouchableOpacity
          onPress={() => setAddCatOpen(true)}
          className="bg-primary rounded-full w-9 h-9 items-center justify-center"
        >
          <Text className="text-primary-foreground text-xl leading-none">+</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading...</Text>
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
              onAddSub={() => setAddSubTarget(cat)}
              onDeleteSub={handleDeleteSubcategory}
            />
          ))}

          {categories.length === 0 && (
            <View className="mt-20 items-center">
              <Text className="text-muted-foreground text-center">
                No categories yet.{"\n"}Tap + to add one.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add category sheet */}
      <Sheet
        visible={addCatOpen}
        onClose={() => setAddCatOpen(false)}
        title="New category"
      >
        <NameInputForm
          placeholder="e.g. Subscriptions"
          submitLabel="Add category"
          onSubmit={handleCreateCategory}
        />
      </Sheet>

      {/* Add subcategory sheet */}
      <Sheet
        visible={!!addSubTarget}
        onClose={() => setAddSubTarget(null)}
        title={`Add to ${addSubTarget?.name ?? ""}`}
      >
        <NameInputForm
          placeholder="e.g. Netflix"
          submitLabel="Add subcategory"
          onSubmit={handleCreateSubcategory}
        />
      </Sheet>
    </View>
  );
}
