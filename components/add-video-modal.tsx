import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { FileVideo, X } from "lucide-react-native";
import type { BpmEstimate } from "@/lib/bpm";
import { IconButton } from "@/components/icon-button";
import { LabelledTextInput } from "@/components/labelled-text-input";
import { PickerField } from "@/components/picker-field";
import { colors, opacity, radii, spacing, typography } from "@/lib/theme";

export type AddVideoDraft = {
  title: string;
  style: string;
  teacher: string;
  sourceUri: string;
  sourceName: string;
  thumbnailUri: string;
  bpm: string;
};

type AddVideoModalProps = {
  draft: AddVideoDraft;
  estimate: BpmEstimate | null;
  isAnalyzing: boolean;
  visible: boolean;
  onChangeDraft: (draft: AddVideoDraft) => void;
  onClose: () => void;
  onPickVideo: () => void;
  onSave: () => void;
};

export function AddVideoModal({
  draft,
  estimate,
  isAnalyzing,
  visible,
  onChangeDraft,
  onClose,
  onPickVideo,
  onSave,
}: AddVideoModalProps) {
  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={visible}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: spacing.screen,
          gap: spacing.xxl,
          backgroundColor: colors.appBackground,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            selectable
            style={{
              color: colors.text,
              fontSize: typography.size.title,
              fontWeight: typography.weight.bold,
            }}
          >
            Add video
          </Text>
          <IconButton icon={X} label="Close" onPress={onClose} />
        </View>
        <LabelledTextInput
          label="Title"
          value={draft.title}
          onChangeText={(title) => onChangeDraft({ ...draft, title })}
        />
        <LabelledTextInput
          label="Style (optional)"
          value={draft.style}
          onChangeText={(style) => onChangeDraft({ ...draft, style })}
        />
        <LabelledTextInput
          label="Teacher"
          value={draft.teacher}
          onChangeText={(teacher) => onChangeDraft({ ...draft, teacher })}
        />
        <PickerField
          label="Video"
          value={draft.sourceName || draft.sourceUri}
          placeholder="Choose video"
          leftAccessory={<FileVideo size={18} color={colors.textSecondary} />}
          onPress={onPickVideo}
        />
        <BpmDetectionStatus estimate={estimate} isAnalyzing={isAnalyzing} />
        <LabelledTextInput
          label="Thumbnail URL"
          value={draft.thumbnailUri}
          onChangeText={(thumbnailUri) =>
            onChangeDraft({ ...draft, thumbnailUri })
          }
        />
        <LabelledTextInput
          label="BPM"
          value={draft.bpm}
          keyboardType="number-pad"
          onChangeText={(bpm) => onChangeDraft({ ...draft, bpm })}
        />
        <Pressable
          accessibilityRole="button"
          disabled={isAnalyzing}
          onPress={onSave}
          style={({ pressed }) => ({
            minHeight: 52,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radii.md,
            borderCurve: "continuous",
            backgroundColor: colors.primary,
            opacity: isAnalyzing
              ? opacity.disabled
              : pressed
                ? opacity.pressedSoft
                : 1,
          })}
        >
          <Text
            style={{
              color: colors.primaryOn,
              fontSize: typography.size.lg,
              fontWeight: typography.weight.bold,
            }}
          >
            {isAnalyzing ? "Analyzing BPM" : "Save video"}
          </Text>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}

function BpmDetectionStatus({
  estimate,
  isAnalyzing,
}: {
  estimate: BpmEstimate | null;
  isAnalyzing: boolean;
}) {
  const label = getBpmStatusLabel(estimate, isAnalyzing);
  const detail =
    estimate?.source === "detected"
      ? `${Math.round(estimate.confidence * 100)}% confidence`
      : estimate?.error;

  return (
    <View
      style={{
        padding: spacing.xl,
        gap: detail ? spacing.xs : 0,
        borderRadius: radii.sm,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor:
          estimate?.source === "detected" ? colors.accentBorder : colors.border,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: typography.size.md,
          fontWeight: typography.weight.bold,
        }}
      >
        {label}
      </Text>
      {detail ? (
        <Text style={{ color: colors.textSecondary, fontSize: typography.size.xs }}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

function getBpmStatusLabel(
  estimate: BpmEstimate | null,
  isAnalyzing: boolean,
) {
  if (isAnalyzing) {
    return "Analyzing BPM";
  }

  if (!estimate) {
    return "BPM will be detected after choosing a video";
  }

  if (estimate.source === "detected" && estimate.bpm) {
    return `${estimate.bpm} BPM detected`;
  }

  return "BPM unavailable";
}
