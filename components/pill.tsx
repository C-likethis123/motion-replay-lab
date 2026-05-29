import { Text, View } from "react-native";
import { colors, spacing } from "@/lib/theme";

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
        style={{ color: colors.accentText, fontSize: 12, fontWeight: "600" }}
      >
        {label}
      </Text>
    </View>
  );
}
