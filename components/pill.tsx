import { Text, View } from "react-native";
import { colors, spacing, typography } from "@/lib/theme";

export function Pill({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.lg,
        minHeight: 26,
        justifyContent: "center",
        borderRadius: 13,
        backgroundColor: colors.accentSoft,
      }}
    >
      <Text
        selectable
        style={{
          color: colors.accentText,
          fontSize: typography.size.xxs,
          fontWeight: typography.weight.semibold,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
