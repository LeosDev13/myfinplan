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

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    if (error) {
      setError(error.message);
    } else {
      router.replace("/(auth)/workspace");
    }
  };

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
          <Text className="text-4xl font-bold text-foreground">{t("auth.register.title")}</Text>
          <Text className="mt-2 text-muted-foreground text-base">
            {t("auth.register.subtitle")}
          </Text>
        </View>

        <View className="gap-4">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t("auth.fields.email")}
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t("auth.fields.password")}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="new-password"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t("auth.fields.confirmPassword")}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="new-password"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          {error && (
            <Text className="text-destructive text-sm text-center">{error}</Text>
          )}

          <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting} className="mt-2">
            {t("auth.register.submit")}
          </Button>
        </View>

        <View className="mt-8 flex-row justify-center gap-1">
          <Text className="text-muted-foreground">{t("auth.register.hasAccount")}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-foreground font-semibold">{t("auth.register.signIn")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
