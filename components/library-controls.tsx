import { Switch, Text, TextInput, View } from "react-native";
import { Search } from "lucide-react-native";
import { colors, radii, spacing, typography } from "@/lib/theme";
import { pluralise } from "@/utils/i18n";

type LibraryControlsProps = {
  onlyBookmarked: boolean;
  query: string;
  videoCount: number;
  onChangeOnlyBookmarked: (value: boolean) => void;
  onChangeQuery: (value: string) => void;
};

export function LibraryControls({
  onlyBookmarked,
  query,
  videoCount,
  onChangeOnlyBookmarked,
  onChangeQuery,
}: LibraryControlsProps) {
  return (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.lg,
          paddingHorizontal: spacing.xxl,
          minHeight: 48,
          borderRadius: radii.md,
          borderCurve: "continuous",
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.borderStrong,
        }}
      >
        <Search size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search videos"
          placeholderTextColor={colors.textSubtle}
          style={{ flex: 1, color: colors.text, fontSize: typography.size.lg }}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.xxxl,
        }}
      >
        <View>
          <Text selectable style={{ color: colors.textMuted, fontSize: typography.size.xs }}>
            Playlist
          </Text>
          <Text
            selectable
            style={{
              color: colors.text,
              fontSize: typography.size.display,
              fontWeight: typography.weight.bold,
              marginTop: spacing.xxs,
            }}
          >
            {pluralise(videoCount, "video")}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
          }}
        >
          <Text selectable style={{ color: colors.accentText, fontSize: typography.size.sm }}>
            Loops
          </Text>
          <Switch
            value={onlyBookmarked}
            onValueChange={onChangeOnlyBookmarked}
          />
        </View>
      </View>
    </>
  );
}
