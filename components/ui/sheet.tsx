import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const { t } = useTranslation();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={{ flex: 1 }}>
        {/* Backdrop — fills space above sheet and handles dismiss taps */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} />
        </TouchableWithoutFeedback>

        {/* Sheet — anchored at bottom via normal flow, no absolute positioning */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View className="bg-card rounded-t-2xl px-6 pt-4 pb-10 max-h-[85%] overflow-hidden">
            {/* Handle */}
            <View className="w-10 h-1 bg-muted rounded-full self-center mb-4" />

            {/* Header */}
            {title && (
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-lg font-semibold text-foreground">{title}</Text>
                <TouchableOpacity onPress={onClose}>
                  <Text className="text-destructive text-base font-medium">{t("common.cancel")}</Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
