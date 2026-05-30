import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { FileVideo, X } from "lucide-react-native";
import { Control, Controller, FieldErrors } from "react-hook-form";
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
  control: Control<AddVideoDraft>;
  errors: FieldErrors<AddVideoDraft>;
  estimate: BpmEstimate | null;
  isAnalyzing: boolean;
  sourceLabel: string;
  visible: boolean;
  onClose: () => void;
  onPickVideo: () => void;
  onSave: () => void;
};

export function AddVideoModal({
  control,
  errors,
  estimate,
  isAnalyzing,
  sourceLabel,
  visible,
  onClose,
  onPickVideo,
  onSave,
}: AddVideoModalProps) {
  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
    >
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
        <Controller
          control={control}
          name="title"
          rules={{ required: "Add a title before saving." }}
          render={({ field: { onChange, value } }) => (
            <LabelledTextInput
              label="Title"
              value={value}
              error={errors.title?.message}
              onChangeText={onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="style"
          render={({ field: { onChange, value } }) => (
            <LabelledTextInput
              label="Style (optional)"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="teacher"
          render={({ field: { onChange, value } }) => (
            <LabelledTextInput
              label="Teacher"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        <PickerField
          label="Video"
          value={sourceLabel}
          placeholder="Choose video"
          leftAccessory={<FileVideo size={18} color={colors.textSecondary} />}
          onPress={onPickVideo}
        />
        {!isAnalyzing && <BpmDetectionStatus estimate={estimate} />}
        <Controller
          control={control}
          name="thumbnailUri"
          render={({ field: { onChange, value } }) => (
            <LabelledTextInput
              label="Thumbnail URL"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="bpm"
          render={({ field: { onChange, value } }) => (
            <LabelledTextInput
              label="BPM"
              value={value}
              keyboardType="number-pad"
              onChangeText={onChange}
            />
          )}
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

function BpmDetectionStatus({ estimate }: { estimate: BpmEstimate | null }) {
  const label = getBpmStatusLabel(estimate);
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
      {detail && (
        <Text
          style={{ color: colors.textSecondary, fontSize: typography.size.xs }}
        >
          {detail}
        </Text>
      )}
    </View>
  );
}

function getBpmStatusLabel(estimate: BpmEstimate | null) {
  if (!estimate) {
    return "BPM will be detected after choosing a video";
  }

  if (estimate.source === "detected" && estimate.bpm) {
    return `${estimate.bpm} BPM detected`;
  }

  return "BPM unavailable";
}
