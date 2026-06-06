import {
  useIsFocused,
  useLocalSearchParams,
  useRouter,
  Stack,
} from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { createVideoPlayer, VideoView, useVideoPlayer } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertTriangle,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react-native";
import { useForm, useWatch } from "react-hook-form";
import { EditVideoDraft, EditVideoModal } from "@/components/edit-video-modal";
import { IconButton } from "@/components/icon-button";
import { Pill } from "@/components/pill";
import {
  formatTime,
  VideoPlaybackControls,
} from "@/components/video-playback-controls";
import { useBpmDetection } from "@/hooks/bpm/useBpmDetection";
import { colors, opacity, radii, spacing, typography } from "@/lib/theme";
import {
  DanceVideo,
  PracticeSection,
  useVideos,
  VideoThumbnailSource,
} from "@/lib/videos";

export default function VideoPracticeScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isFocused = useIsFocused();
  const { videos, updateVideo, deleteVideo } = useVideos();
  const video = videos.find((item) => item.id === id);

  const [showEdit, setShowEdit] = useState(false);
  const {
    control,
    formState: { errors },
    getValues,
    handleSubmit,
    reset,
    setValue,
  } = useForm<EditVideoDraft>({
    defaultValues: makeDraft(video),
  });
  const sourceName = useWatch({ control, name: "sourceName" });
  const sourceUri = useWatch({ control, name: "sourceUri" });
  const sourceLabel = sourceName || sourceUri;
  const { detectBpm, reset: resetBpmDetection } = useBpmDetection(setValue);

  if (!video) {
    return (
      <>
        <Stack.Screen options={{ title: "Video" }} />
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            padding: spacing.screen,
            paddingBottom: spacing.screenBottom + insets.bottom,
            gap: spacing.xxxl,
          }}
        >
          <Text
            selectable
            style={{
              color: colors.text,
              fontSize: typography.size.xxxl,
              fontWeight: typography.weight.bold,
            }}
          >
            Video not found
          </Text>
        </ScrollView>
      </>
    );
  }

  const selectedVideo = video;

  const saveEdit = handleSubmit((draft) => {
    updateVideo(selectedVideo.id, {
      title: draft.title.trim() || selectedVideo.title,
      sourceUri: draft.sourceUri.trim() || selectedVideo.sourceUri,
      thumbnailUri: draft.thumbnailUri.trim() || selectedVideo.thumbnailUri,
      bpm: draft.bpm,
      countSeconds: draft.countSeconds,
      firstBeatTimestamp: draft.firstBeatTimestamp,
      firstEightCountTimestamp: draft.firstEightCountTimestamp,
      bpmSource: draft.bpmSource,
      bpmConfidence: draft.bpmConfidence,
      bpmDetectionError: draft.bpmDetectionError,
      sections: parseSections(draft.sections, selectedVideo.sections),
      labels: draft.labels
        .split(",")
        .map((label) => label.trim())
        .filter((label) => label !== ""),
    });
    setShowEdit(false);
  });

  async function pickEditVideo() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "video/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      const thumbnailUri = await resolveThumbnail(
        asset.uri,
        getValues("thumbnailUri"),
      );

      setValue("sourceUri", asset.uri, { shouldDirty: true });
      setValue("sourceName", asset.name, { shouldDirty: true });
      if (typeof thumbnailUri === "string") {
        setValue("thumbnailUri", thumbnailUri, { shouldDirty: true });
      }

      detectBpm(asset.uri);
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Could not choose video",
        "Please try selecting the video again.",
      );
    }
  }

  function removeVideo() {
    deleteVideo(selectedVideo.id);
    router.back();
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: video.title,
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <IconButton
                icon={Pencil}
                label="Edit video"
                onPress={() => {
                  reset(makeDraft(selectedVideo));
                  resetBpmDetection();
                  setShowEdit(true);
                }}
              />
              <IconButton
                icon={Play}
                label="Practice"
                onPress={() => router.push(`/practice/${id}` as never)}
              />
              <IconButton
                icon={Trash2}
                label="Delete video"
                tone="danger"
                onPress={removeVideo}
              />
            </View>
          ),
        }}
      />
      {isFocused && (
        <FocusedVideoDetailContent
          bottomInset={insets.bottom}
          onUpdateVideo={updateVideo}
          video={selectedVideo}
        />
      )}
      <EditVideoModal
        control={control}
        errors={errors}
        setValue={setValue}
        sourceLabel={sourceLabel}
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        onPickVideo={pickEditVideo}
        onSave={saveEdit}
      />
    </>
  );
}

function FocusedVideoDetailContent({
  bottomInset,
  onUpdateVideo,
  video,
}: {
  bottomInset: number;
  onUpdateVideo: ReturnType<typeof useVideos>["updateVideo"];
  video: DanceVideo;
}) {
  const source = useMemo(() => ({ uri: video.sourceUri }), [video.sourceUri]);
  const player = useVideoPlayer(source, (createdPlayer) => {
    createdPlayer.timeUpdateEventInterval = 0.25;
  });
  const [mirrored, setMirrored] = useState(false);
  const [activeLoop, setActiveLoop] = useState<PracticeSection | null>(null);

  function jumpTo(time: number) {
    // eslint-disable-next-line react-hooks/immutability
    player.currentTime = Math.max(0, time);
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: spacing.screen,
        paddingBottom: spacing.screenBottomTall + bottomInset,
        gap: spacing.screenGap,
      }}
    >
      <View
        style={{
          overflow: "hidden",
          borderRadius: radii.xl,
          borderCurve: "continuous",
          backgroundColor: colors.videoChrome,
          borderWidth: 1,
          borderColor: colors.videoChromeBorder,
        }}
      >
        <VideoView
          player={player}
          nativeControls={false}
          contentFit="contain"
          style={{
            width: "100%",
            aspectRatio: 16 / 9,
            transform: [{ scaleX: mirrored ? -1 : 1 }],
          }}
        />
      </View>

      <VideoPlaybackControls
        activeLoop={activeLoop}
        mirrored={mirrored}
        onMirroredChange={setMirrored}
        onSetEightCountStart={(time) =>
          onUpdateVideo(video.id, {
            firstEightCountTimestamp: time,
            firstBeatTimestamp: video.firstBeatTimestamp ?? time,
          })
        }
        player={player}
        video={video}
      />

      {video.labels.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {video.labels.map((label) => (
            <Pill key={label} label={label} />
          ))}
        </View>
      )}

      {video.bpmDetectionError && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            padding: spacing.xxl,
            gap: spacing.lg,
            borderRadius: radii.lg,
            borderCurve: "continuous",
            backgroundColor: colors.dangerSoft,
            borderWidth: 1,
            borderColor: colors.dangerBorder,
          }}
        >
          <AlertTriangle
            size={20}
            color={colors.danger}
            style={{ marginTop: 1 }}
          />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text
              selectable
              style={{
                color: colors.danger,
                fontSize: typography.size.lg,
                fontWeight: typography.weight.bold,
              }}
            >
              Audio processing failed
            </Text>
            <Text
              selectable
              style={{
                color: colors.text,
                fontSize: typography.size.sm,
                lineHeight: 20,
              }}
            >
              {video.bpmDetectionError}
            </Text>
          </View>
        </View>
      )}

      <View style={{ gap: spacing.lg }}>
        <Text
          selectable
          style={{
            color: colors.text,
            fontSize: typography.size.xxl,
            fontWeight: typography.weight.bold,
          }}
        >
          Sections
        </Text>
        {video.sections.map((section) => {
          const selected = activeLoop?.id === section.id;

          return (
            <Pressable
              key={section.id}
              accessibilityRole="button"
              onPress={() => jumpTo(section.start)}
              onLongPress={() => setActiveLoop(selected ? null : section)}
              style={({ pressed }) => ({
                padding: spacing.xxl,
                gap: spacing.lg,
                borderRadius: radii.lg,
                borderCurve: "continuous",
                backgroundColor: selected
                  ? colors.accentSelected
                  : colors.surface,
                borderWidth: 1,
                borderColor: selected
                  ? colors.accentBorder
                  : colors.borderStrong,
                opacity: pressed ? opacity.pressedSoft : 1,
              })}
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
                    fontSize: typography.size.lg,
                    fontWeight: typography.weight.bold,
                  }}
                >
                  {section.label}
                </Text>
                <IconButton
                  icon={RotateCcw}
                  label={selected ? "Stop loop" : "Loop section"}
                  tone={selected ? "primary" : "plain"}
                  onPress={() => setActiveLoop(selected ? null : section)}
                />
              </View>
              <Text
                selectable
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.size.sm,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {formatTime(section.start)} - {formatTime(section.end)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function makeDraft(video?: DanceVideo) {
  return {
    title: video?.title ?? "",
    sourceUri: video?.sourceUri ?? "",
    sourceName: video?.sourceUri ?? "",
    thumbnailUri:
      typeof video?.thumbnailUri === "string" ? video.thumbnailUri : "",
    bpm: video?.bpm ?? null,
    countSeconds: video?.countSeconds ?? null,
    firstBeatTimestamp: video?.firstBeatTimestamp ?? null,
    firstEightCountTimestamp: video?.firstEightCountTimestamp ?? null,
    bpmSource: video?.bpmSource ?? "unavailable",
    bpmConfidence: video?.bpmConfidence,
    bpmDetectionError: video?.bpmDetectionError,
    sections:
      video?.sections
        .map((section) => `${section.label}, ${section.start}, ${section.end}`)
        .join("\n") ?? "",
    labels: video?.labels.join(", ") ?? "",
  };
}

function parseSections(value: string, fallback: PracticeSection[]) {
  const parsed = value
    .split("\n")
    .map((line, index) => {
      const [label, start, end] = line.split(",").map((part) => part.trim());
      return {
        id: `${label || "section"}-${index}`,
        label,
        start: Number(start),
        end: Number(end),
      };
    })
    .filter(
      (section) =>
        section.label &&
        Number.isFinite(section.start) &&
        Number.isFinite(section.end),
    );

  return parsed.length > 0 ? parsed : fallback;
}

async function resolveThumbnail(
  sourceUri: string,
  thumbnailUri: string,
): Promise<VideoThumbnailSource> {
  if (thumbnailUri) {
    return thumbnailUri;
  }

  const player = createVideoPlayer({ uri: sourceUri });

  try {
    const [thumbnail] = await player.generateThumbnailsAsync(0, {
      maxWidth: 900,
    });
    return thumbnail ?? null;
  } catch {
    return null;
  } finally {
    player.release();
  }
}
