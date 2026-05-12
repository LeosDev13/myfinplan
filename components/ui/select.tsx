import { View, Text, TouchableOpacity, ActionSheetIOS, Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  const selected = options.find((o) => o.value === value);

  const open = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options.map((o) => o.label), "Cancel"],
          cancelButtonIndex: options.length,
          userInterfaceStyle: "dark",
        },
        (index) => {
          if (index < options.length) {
            onChange(options[index].value);
          }
        }
      );
    } else {
      Alert.alert(
        label ?? "Select",
        undefined,
        [
          ...options.map((o) => ({
            text: o.label,
            onPress: () => onChange(o.value),
          })),
          { text: "Cancel", style: "cancel" as const },
        ]
      );
    }
  };

  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text style={{ color: "#525252", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 }}>
          {label}
        </Text>
      )}
      <TouchableOpacity
        onPress={open}
        style={{
          height: 52,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: error ? "#ef4444" : "#1f1f1f",
          backgroundColor: "#0a0a0a",
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: selected ? "#ffffff" : "#525252", fontSize: 15, fontWeight: "500" }}>
          {selected?.label ?? "Select…"}
        </Text>
        <Ionicons name="chevron-expand-outline" size={16} color="#525252" />
      </TouchableOpacity>
      {error && (
        <Text style={{ color: "#ef4444", fontSize: 12 }}>{error}</Text>
      )}
    </View>
  );
}
