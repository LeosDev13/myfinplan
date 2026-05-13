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
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: "myfinplan://reset-password",
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
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
          <Text className="text-4xl font-bold text-foreground">{t("auth.forgotPassword.title")}</Text>
          <Text className="mt-2 text-muted-foreground text-base">
            {t("auth.forgotPassword.subtitle")}
          </Text>
        </View>

        {sent ? (
          <View className="gap-4">
            <Text className="text-foreground text-base text-center">
              {t("auth.forgotPassword.sent")}
            </Text>
          </View>
        ) : (
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

            {error && (
              <Text className="text-destructive text-sm text-center">{error}</Text>
            )}

            <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting} className="mt-2">
              {t("auth.forgotPassword.submit")}
            </Button>
          </View>
        )}

        <TouchableOpacity className="mt-10 items-center" onPress={() => router.back()}>
          <Text className="text-muted-foreground text-sm">{t("auth.forgotPassword.back")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
