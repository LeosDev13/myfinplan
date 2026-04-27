import { TextInput, TextInputProps, View, Text } from "react-native";
import { cn } from "~/lib/utils";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <View className="gap-1.5">
      {label && (
        <Text className="text-sm font-medium text-foreground">{label}</Text>
      )}
      <TextInput
        className={cn(
          "h-12 rounded-lg border border-input bg-background px-4 text-base text-foreground",
          "placeholder:text-muted-foreground",
          error && "border-destructive",
          className
        )}
        placeholderTextColor="hsl(240 3.8% 46.1%)"
        {...props}
      />
      {error && (
        <Text className="text-sm text-destructive">{error}</Text>
      )}
    </View>
  );
}
