import { ComponentType } from "react";
import { Pressable, Text, ViewStyle } from "react-native";
import type { LucideProps } from "lucide-react-native";
import { colors, opacity, radii } from "@/lib/theme";

type IconButtonProps = {
  icon: ComponentType<LucideProps>;
  label: string;
  onPress: () => void;
  tone?: "primary" | "plain" | "danger";
  style?: ViewStyle;
};

const tones = {
  primary: {
    backgroundColor: colors.primary,
    color: colors.primaryOn,
    borderColor: colors.primary,
  },
  plain: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    borderColor: colors.dangerBorder,
  },
};

export function IconButton({
  icon: Icon,
  label,
  onPress,
  tone = "plain",
  style,
}: IconButtonProps) {
  const colors = tones[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 44,
          minWidth: 44,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.sm,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: colors.borderColor,
          backgroundColor: colors.backgroundColor,
          opacity: disabled ? opacity.disabled : pressed ? opacity.pressed : 1,
        },
        style,
      ]}
    >
      <Icon color={colors.color} size={20} strokeWidth={2.2} />
      <Text style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}>
        {label}
      </Text>
    </Pressable>
  );
}
