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

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Sheet({ visible, onClose, title, children }: SheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/50" />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="absolute bottom-0 left-0 right-0"
      >
        <View className="bg-card rounded-t-2xl px-6 pt-4 pb-10 max-h-[85%]">
          {/* Handle */}
          <View className="w-10 h-1 bg-muted rounded-full self-center mb-4" />

          {/* Header */}
          {title && (
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-lg font-semibold text-foreground">{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Text className="text-muted-foreground text-base">Cancel</Text>
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
    </Modal>
  );
}
