import { Text, View } from "react-native";
import { Plus, Search } from "lucide-react-native";
import { IconButton } from "@/components/icon-button";
import { TextInputField } from "@/components/labelled-text-input";
import { colors, radii, spacing, typography } from "@/lib/theme";
import { pluralise } from "@/utils/i18n";

type LibraryControlsProps = {
  query: string;
  videoCount: number;
  onChangeQuery: (value: string) => void;
  onAddVideo: () => void;
};

export function LibraryControls({
  query,
  videoCount,
  onChangeQuery,
  onAddVideo,
}: LibraryControlsProps) {
  return (
    <>
      <Text
        selectable
        style={{
          color: colors.textSecondary,
          fontSize: typography.size.lg,
          fontWeight: typography.weight.semibold,
        }}
      >
        {pluralise(videoCount, "video")}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
        }}
      >
        <TextInputField
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search videos"
          leftAccessory={<Search size={18} color={colors.textMuted} />}
          style={{ flex: 1, minWidth: 0 }}
          fieldStyle={{
            borderColor: colors.borderStrong,
            borderRadius: radii.md,
          }}
        />
        <IconButton
          icon={Plus}
          label="Add video"
          onPress={onAddVideo}
          tone="primary"
        />
      </View>
    </>
  );
}
