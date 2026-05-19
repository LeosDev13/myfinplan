import { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList } from "react-native";

interface MerchantInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur: () => void;
  merchants: string[]; // all known merchants
}

export function MerchantInput({
  label,
  placeholder,
  value,
  onChangeText,
  onBlur,
  merchants,
}: MerchantInputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const suggestions =
    value.length > 0
      ? merchants.filter(
          (m) =>
            m.toLowerCase().includes(value.toLowerCase()) &&
            m.toLowerCase() !== value.toLowerCase()
        )
      : [];

  const showSuggestions = focused && suggestions.length > 0;

  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          color: "#525252",
          fontSize: 11,
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {label}
      </Text>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#525252"
        onFocus={() => setFocused(true)}
        onBlur={() => {
          // Delay hiding suggestions so a tap registers first
          setTimeout(() => {
            setFocused(false);
            onBlur();
          }, 150);
        }}
        style={{
          height: 52,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: focused ? "#10b981" : "#1f1f1f",
          backgroundColor: "#0a0a0a",
          paddingHorizontal: 16,
          fontSize: 15,
          fontWeight: "500",
          color: "#ffffff",
        }}
      />

      {showSuggestions && (
        <View
          style={{
            backgroundColor: "#141414",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#1f1f1f",
            overflow: "hidden",
          }}
        >
          <FlatList
            data={suggestions.slice(0, 5)}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="always"
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                onPress={() => {
                  onChangeText(item);
                  setFocused(false);
                  inputRef.current?.blur();
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: "#1f1f1f",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Text style={{ color: "#525252", fontSize: 13 }}>⟳</Text>
                <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "500" }}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}
