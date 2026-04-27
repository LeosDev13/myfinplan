import { View, Text, TouchableOpacity } from "react-native";
import { cn } from "~/lib/utils";

interface Option<T extends string> {
  label: string;
  value: T;
}

interface SelectProps<T extends string> {
  label?: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  error?: string;
}

export function Select<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: SelectProps<T>) {
  return (
    <View className="gap-1.5">
      {label && (
        <Text className="text-sm font-medium text-foreground">{label}</Text>
      )}
      <View className="flex-row gap-2 flex-wrap">
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={cn(
              "px-4 py-2.5 rounded-lg border",
              value === opt.value
                ? "bg-primary border-primary"
                : "bg-background border-input"
            )}
          >
            <Text
              className={cn(
                "text-sm font-medium",
                value === opt.value ? "text-primary-foreground" : "text-foreground"
              )}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}
