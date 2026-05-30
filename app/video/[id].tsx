import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { createVideoPlayer, VideoView, useVideoPlayer } from "expo-video";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FlipHorizontal,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Trash2,
} from "lucide-react-native";
import { useForm, useWatch } from "react-hook-form";
import { EditVideoDraft, EditVideoModal } from "@/components/edit-video-modal";
import { IconButton } from "@/components/icon-button";
import { useBpmDetection } from "@/hooks/bpm/useBpmDetection";
import { deriveBpmTiming, parseBpmInput } from "@/lib/bpm";
import { colors, opacity, radii, spacing, typography } from "@/lib/theme";
import {
  DanceVideo,
  PracticeSection,
  useVideos,
  VideoThumbnailSource,
} from "@/lib/videos";

const speeds = [0.5, 0.75, 1, 1.25];
const fallbackCountSeconds = 60 / 100;

export default function VideoPracticeScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { videos, updateVideo, deleteVideo } = useVideos();
  const video = videos.find((item) => item.id === id);
  const source = useMemo(
    () => (video ? { uri: video.sourceUri } : null),
    [video],
  );
  const player = useVideoPlayer(source, (createdPlayer) => {
    createdPlayer.timeUpdateEventInterval = 0.25;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mirrored, setMirrored] = useState(false);
  const [activeLoop, setActiveLoop] = useState<PracticeSection | null>(null);
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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(player.currentTime || 0);
      setDuration(player.duration || 0);
      setIsPlaying(player.playing);

      if (activeLoop && player.currentTime >= activeLoop.end) {
        player.currentTime = activeLoop.start;
        player.play();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [activeLoop, player]);

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
  const countSeconds = video.countSeconds ?? fallbackCountSeconds;

  function hapticTap() {
    if (process.env.EXPO_OS === "ios") {
      Haptics.selectionAsync();
    }
  }

  function togglePlay() {
    hapticTap();
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!player.playing);
  }

  function jump(seconds: number) {
    hapticTap();
    player.seekBy(seconds);
  }

  function jumpCounts(counts: number) {
    jump(countSeconds * counts);
  }

  function jumpTo(time: number) {
    hapticTap();
    // eslint-disable-next-line react-hooks/immutability
    player.currentTime = Math.max(0, time);
  }

  const saveEdit = handleSubmit((draft) => {
    updateVideo(selectedVideo.id, {
      title: draft.title.trim() || selectedVideo.title,
      style: draft.style.trim() || selectedVideo.style,
      teacher: draft.teacher.trim() || selectedVideo.teacher,
      sourceUri: draft.sourceUri.trim() || selectedVideo.sourceUri,
      thumbnailUri: draft.thumbnailUri.trim() || selectedVideo.thumbnailUri,
      ...deriveBpmTiming(parseBpmInput(draft.bpm)),
      sections: parseSections(draft.sections, selectedVideo.sections),
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
                icon={Trash2}
                label="Delete video"
                tone="danger"
                onPress={removeVideo}
              />
            </View>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: spacing.screen,
          paddingBottom: spacing.screenBottomTall + insets.bottom,
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

        <View style={{ gap: spacing.lg }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: spacing.xl,
            }}
          >
            <Text
              selectable
              style={{
                color: colors.text,
                fontSize: typography.size.xl,
                fontWeight: typography.weight.bold,
              }}
            >
              {formatTime(currentTime)}
            </Text>
            <Text
              selectable
              style={{
                color: colors.textMuted,
                fontSize: typography.size.xl,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatTime(duration)}
            </Text>
          </View>
          <View
            style={{
              height: 8,
              borderRadius: radii.xs,
              backgroundColor: colors.progressTrack,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%`,
                height: "100%",
                backgroundColor: colors.accent,
              }}
            />
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: spacing.xl,
          }}
        >
          <IconButton
            icon={SkipBack}
            label="Back one count"
            onPress={() => jumpCounts(-1)}
          />
          <IconButton
            icon={SkipBack}
            label="Back eight count"
            onPress={() => jumpCounts(-8)}
          />
          <IconButton
            icon={isPlaying ? Pause : Play}
            label={isPlaying ? "Pause" : "Play"}
            tone="primary"
            onPress={togglePlay}
            style={{ minWidth: 64 }}
          />
          <IconButton
            icon={SkipForward}
            label="Forward one count"
            onPress={() => jumpCounts(1)}
          />
          <IconButton
            icon={SkipForward}
            label="Forward eight count"
            onPress={() => jumpCounts(8)}
          />
        </View>

        <View
          style={{
            padding: spacing.xxl,
            gap: spacing.xxl,
            borderRadius: radii.lg,
            borderCurve: "continuous",
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.borderStrong,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.lg,
              }}
            >
              <FlipHorizontal size={18} color={colors.accent} />
              <Text
                selectable
                style={{
                  color: colors.text,
                  fontSize: typography.size.lg,
                  fontWeight: typography.weight.bold,
                }}
              >
                Mirror
              </Text>
            </View>
            <Switch value={mirrored} onValueChange={setMirrored} />
          </View>

          <View
            style={{ flexDirection: "row", gap: spacing.md, flexWrap: "wrap" }}
          >
            {speeds.map((speed) => (
              <Pressable
                key={speed}
                accessibilityRole="button"
                onPress={() => {
                  player.playbackRate = speed;
                  hapticTap();
                }}
                style={({ pressed }) => ({
                  minHeight: 36,
                  paddingHorizontal: spacing.xxl,
                  justifyContent: "center",
                  borderRadius: radii.xl,
                  backgroundColor:
                    player.playbackRate === speed
                      ? colors.primary
                      : colors.accentSoft,
                  opacity: pressed ? opacity.pressed : 1,
                })}
              >
                <Text
                  selectable
                  style={{
                    color:
                      player.playbackRate === speed
                        ? colors.primaryOn
                        : colors.accentText,
                    fontSize: typography.size.sm,
                    fontWeight: typography.weight.bold,
                  }}
                >
                  {speed}x
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

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
      <EditVideoModal
        control={control}
        errors={errors}
        sourceLabel={sourceLabel}
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        onPickVideo={pickEditVideo}
        onSave={saveEdit}
      />
    </>
  );
}

function makeDraft(video?: DanceVideo) {
  return {
    title: video?.title ?? "",
    style: video?.style ?? "",
    teacher: video?.teacher ?? "",
    sourceUri: video?.sourceUri ?? "",
    sourceName: video?.sourceUri ?? "",
    thumbnailUri:
      typeof video?.thumbnailUri === "string" ? video.thumbnailUri : "",
    bpm: video?.bpm?.toString() ?? "",
    sections:
      video?.sections
        .map((section) => `${section.label}, ${section.start}, ${section.end}`)
        .join("\n") ?? "",
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

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
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
