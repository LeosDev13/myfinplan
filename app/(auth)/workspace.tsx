import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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
  const [tab, setTab] = useState<Tab>("create");
  const [error, setError] = useState<string | null>(null);

  const createForm = useForm<CreateData>({ resolver: zodResolver(createSchema) });
  const joinForm = useForm<JoinData>({ resolver: zodResolver(joinSchema) });

  const onCreateSubmit = async (data: CreateData) => {
    setError(null);
    const { data: result, error } = await supabase.functions.invoke("create-workspace", {
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
    const { data: result, error } = await supabase.functions.invoke("join-workspace", {
      body: { joinCode: data.joinCode.toUpperCase() },
    });
    if (error) {
      setError(
        error.message.includes("404") || error.message.includes("Invalid")
          ? "Invalid join code. Check with your partner."
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
        {/* Header */}
        <View className="mb-10">
          <Text className="text-4xl font-bold text-foreground">Your workspace</Text>
          <Text className="mt-2 text-muted-foreground text-base">
            Create a new workspace or join an existing one with a code.
          </Text>
        </View>

        {/* Tab switcher */}
        <View className="flex-row rounded-lg bg-muted p-1 mb-6">
          {(["create", "join"] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => { setTab(t); setError(null); }}
              className={`flex-1 py-2 rounded-md items-center ${tab === t ? "bg-background shadow-sm" : ""}`}
            >
              <Text className={`text-sm font-medium ${tab === t ? "text-foreground" : "text-muted-foreground"}`}>
                {t === "create" ? "Create new" : "Join existing"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Create form */}
        {tab === "create" && (
          <View className="gap-4">
            <Controller
              control={createForm.control}
              name="workspaceName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Workspace name"
                  placeholder="e.g. Leo & Sara"
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
            <Button
              onPress={createForm.handleSubmit(onCreateSubmit)}
              loading={isSubmitting}
            >
              Create workspace
            </Button>
          </View>
        )}

        {/* Join form */}
        {tab === "join" && (
          <View className="gap-4">
            <Controller
              control={joinForm.control}
              name="joinCode"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Join code"
                  placeholder="X7K2MQ"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                  onChangeText={(t) => onChange(t.toUpperCase())}
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
            <Button
              onPress={joinForm.handleSubmit(onJoinSubmit)}
              loading={isSubmitting}
            >
              Join workspace
            </Button>
          </View>
        )}

        {/* Sign out link */}
        <TouchableOpacity
          className="mt-10 items-center"
          onPress={() => supabase.auth.signOut()}
        >
          <Text className="text-muted-foreground text-sm">Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
