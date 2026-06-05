import { ReactNode } from "react";
import { Text, View } from "react-native";
import { colors, spacing, typography } from "@/lib/theme";

type PillTone = "accent" | "danger";

export function Pill({
  icon,
  label,
  tone = "accent",
}: {
  icon?: ReactNode;
  label: string;
  tone?: PillTone;
}) {
  const backgroundColor =
    tone === "danger" ? colors.dangerSoft : colors.accentSoft;
  const color = tone === "danger" ? colors.danger : colors.accentText;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        minHeight: 26,
        justifyContent: "center",
        borderRadius: 13,
        backgroundColor,
      }}
    >
      {icon}
      <Text
        selectable
        style={{
          color,
          fontSize: typography.size.xxs,
          fontWeight: typography.weight.semibold,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
