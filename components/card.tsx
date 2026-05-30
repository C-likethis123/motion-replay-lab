import { forwardRef, ReactNode } from "react";
import { Image as ExpoImage, ImageProps } from "expo-image";
import {
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  TextProps,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";
import { colors, opacity, radii, shadows, spacing, typography } from "@/lib/theme";

type CardRootProps = PressableProps & {
  style?: StyleProp<ViewStyle>;
};

type CardImageProps = Omit<ImageProps, "source"> & {
  source?: ImageProps["source"] | null;
  fallback?: ReactNode;
  fallbackStyle?: StyleProp<ViewStyle>;
};

type CardTextProps = TextProps & {
  children: ReactNode;
};

const CardRoot = forwardRef<View, CardRootProps>(function CardRoot(
  { children, disabled, style, ...props },
  ref,
) {
  return (
    <Pressable
      ref={ref}
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
          flexDirection: "row",
          gap: spacing.xl,
          padding: spacing.lg,
          borderRadius: radii.lg,
          borderCurve: "continuous",
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          opacity: disabled
            ? opacity.disabled
            : pressed
              ? opacity.pressedCard
              : 1,
          boxShadow: shadows.card,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
});

function CardContent({ children, style, ...props }: ViewProps) {
  return (
    <View
      style={[{ flex: 1, justifyContent: "space-between", minHeight: 94 }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

function CardImage({
  source,
  fallback,
  fallbackStyle,
  style,
  contentFit = "cover",
  ...props
}: CardImageProps) {
  const imageStyle = [{ width: 104, aspectRatio: 1.1, borderRadius: radii.sm }, style];

  if (source) {
    return (
      <ExpoImage
        source={source}
        style={imageStyle}
        contentFit={contentFit}
        {...props}
      />
    );
  }

  return (
    <View
      style={[
        {
          width: 104,
          aspectRatio: 1.1,
          borderRadius: radii.sm,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.accentSoft,
        },
        fallbackStyle,
      ]}
    >
      {fallback}
    </View>
  );
}

function CardTitle({ children, style, ...props }: CardTextProps) {
  return (
    <Text
      selectable
      style={[
        {
          color: colors.text,
          fontSize: typography.size.xl,
          fontWeight: typography.weight.bold,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

function CardDescription({ children, style, ...props }: CardTextProps) {
  return (
    <Text
      selectable
      style={[
        { color: colors.textSecondary, fontSize: typography.size.sm },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

function CardFooter({ children, style, ...props }: ViewProps) {
  return (
    <View
      style={[
        { flexDirection: "row", gap: spacing.md, flexWrap: "wrap" },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export const Card = Object.assign(CardRoot, {
  Content: CardContent,
  Description: CardDescription,
  Footer: CardFooter,
  Image: CardImage,
  Title: CardTitle,
});
