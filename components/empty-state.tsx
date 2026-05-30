import { ComponentType } from "react";
import { Pressable, Text, View } from "react-native";
import type { LucideProps } from "lucide-react-native";
import { colors, opacity, radii, spacing, typography } from "@/lib/theme";

type EmptyStateProps = {
  icon: ComponentType<LucideProps>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View
      style={{
        alignItems: "center",
        gap: spacing.xxxl,
        paddingHorizontal: spacing.screen,
        paddingVertical: spacing.screenBottomTall,
        borderRadius: radii.lg,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.borderStrong,
        backgroundColor: colors.surface,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.lg,
          borderCurve: "continuous",
          backgroundColor: colors.accentSoft,
        }}
      >
        <Icon size={26} color={colors.accentText} strokeWidth={2.2} />
      </View>

      <View style={{ alignItems: "center", gap: spacing.md }}>
        <Text
          selectable
          style={{
            color: colors.text,
            fontSize: typography.size.xxl,
            fontWeight: typography.weight.bold,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        <Text
          selectable
          style={{
            color: colors.textSecondary,
            fontSize: typography.size.md,
            lineHeight: 22,
            maxWidth: 320,
            textAlign: "center",
          }}
        >
          {description}
        </Text>
      </View>

      {actionLabel && onAction && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={({ pressed }) => [
            {
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing.md,
              paddingHorizontal: spacing.xxxl,
              borderRadius: radii.sm,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: colors.primary,
              backgroundColor: colors.primary,
              opacity: pressed ? opacity.pressed : 1,
            },
          ]}
        >
          <Icon size={18} color={colors.primaryOn} strokeWidth={2.2} />
          <Text
            style={{
              color: colors.primaryOn,
              fontSize: typography.size.md,
              fontWeight: typography.weight.semibold,
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
