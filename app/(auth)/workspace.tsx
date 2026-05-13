import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "~/lib/supabase";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

type Tab = "create" | "join";

const createSchema = z.object({
  workspaceName: z.string().min(1, "Workspace name is required"),
});
const joinSchema = z.object({
  joinCode: z.string().length(6, "Join code must be 6 characters"),
});

type CreateData = z.infer<typeof createSchema>;
type JoinData = z.infer<typeof joinSchema>;

export default function WorkspaceScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("create");
  const [error, setError] = useState<string | null>(null);

  const createForm = useForm<CreateData>({ resolver: zodResolver(createSchema) });
  const joinForm = useForm<JoinData>({ resolver: zodResolver(joinSchema) });

  const onCreateSubmit = async (data: CreateData) => {
    setError(null);
    const { error } = await supabase.functions.invoke("create-workspace", {
      body: { workspaceName: data.workspaceName },
    });
    if (error) {
      setError(error.message);
    } else {
      router.replace("/(app)");
    }
  };

  const onJoinSubmit = async (data: JoinData) => {
    setError(null);
    const { error } = await supabase.functions.invoke("join-workspace", {
      body: { joinCode: data.joinCode.toUpperCase() },
    });
    if (error) {
      setError(
        error.message.includes("404") || error.message.includes("Invalid")
          ? t("auth.workspace.invalidCode")
          : error.message
      );
    } else {
      router.replace("/(app)");
    }
  };

  const isSubmitting =
    tab === "create"
      ? createForm.formState.isSubmitting
      : joinForm.formState.isSubmitting;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-10">
          <Text className="text-4xl font-bold text-foreground">{t("auth.workspace.title")}</Text>
          <Text className="mt-2 text-muted-foreground text-base">
            {t("auth.workspace.subtitle")}
          </Text>
        </View>

        <View className="flex-row rounded-lg bg-muted p-1 mb-6">
          {(["create", "join"] as Tab[]).map((tabKey) => (
            <TouchableOpacity
              key={tabKey}
              onPress={() => { setTab(tabKey); setError(null); }}
              className={`flex-1 py-2 rounded-md items-center ${tab === tabKey ? "bg-background shadow-sm" : ""}`}
            >
              <Text className={`text-sm font-medium ${tab === tabKey ? "text-foreground" : "text-muted-foreground"}`}>
                {tabKey === "create" ? t("auth.workspace.tabCreate") : t("auth.workspace.tabJoin")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === "create" && (
          <View className="gap-4">
            <Controller
              control={createForm.control}
              name="workspaceName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t("auth.workspace.nameLabel")}
                  placeholder={t("auth.workspace.namePlaceholder")}
                  autoCapitalize="words"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={createForm.formState.errors.workspaceName?.message}
                />
              )}
            />
            {error && (
              <Text className="text-destructive text-sm text-center">{error}</Text>
            )}
            <Button onPress={createForm.handleSubmit(onCreateSubmit)} loading={isSubmitting}>
              {t("auth.workspace.createSubmit")}
            </Button>
          </View>
        )}

        {tab === "join" && (
          <View className="gap-4">
            <Controller
              control={joinForm.control}
              name="joinCode"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t("auth.workspace.joinCodeLabel")}
                  placeholder="X7K2MQ"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                  onChangeText={(v) => onChange(v.toUpperCase())}
                  onBlur={onBlur}
                  value={value}
                  error={joinForm.formState.errors.joinCode?.message}
                  className="text-center text-2xl tracking-widest font-mono"
                />
              )}
            />
            {error && (
              <Text className="text-destructive text-sm text-center">{error}</Text>
            )}
            <Button onPress={joinForm.handleSubmit(onJoinSubmit)} loading={isSubmitting}>
              {t("auth.workspace.joinSubmit")}
            </Button>
          </View>
        )}

        <TouchableOpacity className="mt-10 items-center" onPress={() => supabase.auth.signOut()}>
          <Text className="text-muted-foreground text-sm">{t("settings.signOut")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
