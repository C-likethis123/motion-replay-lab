import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { FileVideo, X } from "lucide-react-native";
import { Control, Controller, FieldErrors } from "react-hook-form";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BpmEstimate } from "@/lib/bpm";
import { IconButton } from "@/components/icon-button";
import { LabelledTextInput } from "@/components/labelled-text-input";
import { PickerField } from "@/components/picker-field";
import { colors, opacity, radii, spacing, typography } from "@/lib/theme";

export type EditVideoDraft = {
  title: string;
  style: string;
  teacher: string;
  sourceUri: string;
  sourceName: string;
  thumbnailUri: string;
  bpm: string;
  sections: string;
};

type EditVideoModalProps = {
  control: Control<EditVideoDraft>;
  errors: FieldErrors<EditVideoDraft>;
  sourceLabel: string;
  visible: boolean;
  onClose: () => void;
  onPickVideo: () => void;
  onSave: () => void;
};

export function EditVideoModal({
  control,
  errors,
  sourceLabel,
  visible,
  onClose,
  onPickVideo,
  onSave,
}: EditVideoModalProps) {
  const insets = useSafeAreaInsets();

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
          paddingTop: spacing.screen + insets.top,
          paddingBottom: spacing.screenBottom + insets.bottom,
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
            Edit video
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
        <Controller
          control={control}
          name="sections"
          render={({ field: { onChange, value } }) => (
            <LabelledTextInput
              label="Sections"
              value={value}
              multiline
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
            opacity: pressed ? opacity.pressedSoft : 1,
          })}
        >
          <Text
            style={{
              color: colors.primaryOn,
              fontSize: typography.size.lg,
              fontWeight: typography.weight.bold,
            }}
          >
            Save changes
          </Text>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}
