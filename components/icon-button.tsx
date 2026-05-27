import { ComponentType } from "react";
import { Pressable, Text, ViewStyle } from "react-native";
import type { LucideProps } from "lucide-react-native";

type IconButtonProps = {
  icon: ComponentType<LucideProps>;
  label: string;
  onPress: () => void;
  tone?: "primary" | "plain" | "danger";
  style?: ViewStyle;
};

const tones = {
  primary: { backgroundColor: "#1f2a2e", color: "#ffffff", borderColor: "#1f2a2e" },
  plain: { backgroundColor: "#ffffff", color: "#1f2a2e", borderColor: "#d8d1c7" },
  danger: { backgroundColor: "#fff5f3", color: "#b42318", borderColor: "#f0c7c0" },
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
          borderRadius: 12,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: colors.borderColor,
          backgroundColor: colors.backgroundColor,
          opacity: pressed ? 0.72 : 1,
        },
        style,
      ]}
    >
      <Icon color={colors.color} size={20} strokeWidth={2.2} />
      <Text style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}>{label}</Text>
    </Pressable>
  );
}
