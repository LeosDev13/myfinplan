import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useCategoryMutations } from "~/lib/database/categories";
import { useWorkspace } from "~/app/providers/WorkspaceProvider";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
});
type FormData = z.infer<typeof schema>;

export default function AddCategoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workspaceId } = useWorkspace();
  const { createCategory } = useCategoryMutations();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  const onSubmit = async (data: FormData) => {
    if (!workspaceId) return;
    await createCategory(workspaceId, data.name);
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
          New category
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
              label="Name"
              placeholder="e.g. Subscriptions"
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
          Add category
        </Button>
      </ScrollView>
    </View>
  );
}
