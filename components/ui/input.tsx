import { TextInput, TextInputProps, View, Text } from "react-native";
import { useState } from "react";
import { cn } from "~/lib/utils";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="gap-1.5">
      {label && (
        <Text className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </Text>
      )}
      <TextInput
        className={cn(
          "h-[52px] rounded-xl border bg-input px-4 text-base font-medium text-foreground",
          focused ? "border-primary" : "border-border",
          error && "border-destructive",
          className
        )}
        placeholderTextColor="#525252"
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && (
        <Text className="text-sm text-destructive">{error}</Text>
      )}
    </View>
  );
}
