import { TextInput as RnTextInput, View, Text } from "react-native";
import { colors, radii, spacing } from "@/lib/theme";

export function LabelledTextInput({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        selectable
        style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "600" }}
      >
        {label}
      </Text>
      <RnTextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="none"
        style={{
          minHeight: 48,
          paddingHorizontal: spacing.xxl,
          borderRadius: radii.sm,
          borderCurve: "continuous",
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          color: colors.text,
          fontSize: 16,
        }}
      />
    </View>
  );
}
