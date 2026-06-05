import { ReactNode } from "react";
import {
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { colors, opacity, radii, spacing, typography } from "@/lib/theme";

type PickerFieldProps = Omit<PressableProps, "style"> & {
  label: string;
  value?: string;
  placeholder?: string;
  leftAccessory?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function PickerField({
  label,
  value,
  placeholder = "Choose",
  leftAccessory,
  disabled,
  style,
  ...props
}: PickerFieldProps) {
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
      <Pressable
        {...props}
        accessibilityRole={props.accessibilityRole ?? "button"}
        accessibilityState={
          disabled
            ? { ...props.accessibilityState, disabled: true }
            : props.accessibilityState
        }
        disabled={disabled}
        style={({ pressed }) => [
          {
            minHeight: 48,
            paddingHorizontal: spacing.xxl,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.lg,
            borderRadius: radii.sm,
            borderCurve: "continuous",
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: disabled
              ? opacity.disabled
              : pressed
                ? opacity.pressedSoft
                : 1,
          },
          style,
        ]}
      >
        {leftAccessory}
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: value ? colors.text : colors.textSubtle,
            fontSize: typography.size.lg,
          }}
        >
          {value || placeholder}
        </Text>
      </Pressable>
    </View>
  );
}
