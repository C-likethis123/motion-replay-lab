import { TextInput as RnTextInput, View, Text } from "react-native";
import { colors, radii, spacing, typography } from "@/lib/theme";

export function LabelledTextInput({
  label,
  value,
  onChangeText,
  keyboardType,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "number-pad";
  error?: string;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        selectable
        style={{
          color: colors.textSecondary,
          fontSize: typography.size.xs,
          fontWeight: typography.weight.semibold,
        }}
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
          borderColor: error ? colors.dangerBorder : colors.border,
          color: colors.text,
          fontSize: typography.size.lg,
        }}
      />
      {error && (
        <Text style={{ color: colors.danger, fontSize: typography.size.xs }}>
          {error}
        </Text>
      )}
    </View>
  );
}
