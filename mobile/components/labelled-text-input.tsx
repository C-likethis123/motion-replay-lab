import type { ReactNode } from "react";
import {
  TextInput as RnTextInput,
  View,
  Text,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { colors, radii, spacing, typography } from "@/lib/theme";

type TextInputFieldProps = Omit<TextInputProps, "style"> & {
  label?: string;
  error?: string;
  leftAccessory?: ReactNode;
  fieldStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
};

export function TextInputField({
  label,
  multiline,
  error,
  leftAccessory,
  fieldStyle,
  inputStyle,
  style,
  autoCapitalize = "none",
  placeholderTextColor = colors.textSubtle,
  ...textInputProps
}: TextInputFieldProps) {
  const hasLeftAccessory = Boolean(leftAccessory);

  return (
    <View style={[{ gap: spacing.sm }, style]}>
      {label && (
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
      )}
      <View
        style={[
          {
            minHeight: multiline ? 124 : 48,
            flexDirection: "row",
            alignItems: multiline ? "flex-start" : "center",
            gap: hasLeftAccessory ? spacing.lg : 0,
            paddingHorizontal: spacing.xxl,
            paddingVertical: multiline ? spacing.xl : 0,
            borderRadius: radii.sm,
            borderCurve: "continuous",
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: error ? colors.dangerBorder : colors.border,
          },
          fieldStyle,
        ]}
      >
        {leftAccessory}
        <RnTextInput
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          placeholderTextColor={placeholderTextColor}
          style={[
            {
              flex: 1,
              minWidth: 0,
              color: colors.text,
              fontSize: typography.size.lg,
              textAlignVertical: multiline ? "top" : "center",
            },
            inputStyle,
          ]}
          {...textInputProps}
        />
      </View>
      {error && (
        <Text style={{ color: colors.danger, fontSize: typography.size.xs }}>
          {error}
        </Text>
      )}
    </View>
  );
}

export function LabelledTextInput({
  label,
  ...textInputProps
}: TextInputFieldProps & {
  label: string;
}) {
  return <TextInputField label={label} {...textInputProps} />;
}
