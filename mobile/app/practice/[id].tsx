import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pencil, Trash2 } from "lucide-react-native";
import { useForm } from "react-hook-form";
import { EditVideoModal, EditVideoDraft } from "@/components/edit-video-modal";
import { VideoPlaybackControls } from "@/components/video-playback-controls";
import { deriveBpmTiming } from "@/lib/bpm";
import { useVideos, DanceVideo, PracticeSection } from "@/lib/videos";
import { colors, radii, spacing } from "@/lib/theme";

function makeDraft(video?: DanceVideo) {
  return {
    title: video?.title ?? "",
    sourceUri: video?.sourceUri ?? "",
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

export default function PracticeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { videos, updateVideo, deleteVideo } = useVideos();
  const video = videos.find((item) => item.id === id);
  const [showEdit, setShowEdit] = useState(false);
  const { control, handleSubmit, reset } = useForm<EditVideoDraft>({
    defaultValues: makeDraft(video),
  });

  const source = useMemo(() => (video ? { uri: video.sourceUri } : null), [video]);
  const player = useVideoPlayer(source, (createdPlayer) => {
    createdPlayer.timeUpdateEventInterval = 0.25;
  });
  const [mirrored, setMirrored] = useState(false);

  if (!video) return <Text>Video not found</Text>;

  const saveEdit = handleSubmit((draft) => {
    updateVideo(video.id, {
      title: draft.title.trim() || video.title,
      sourceUri: draft.sourceUri.trim() || video.sourceUri,
      thumbnailUri: draft.thumbnailUri.trim() || video.thumbnailUri,
      bpm: draft.bpm,
      countSeconds: draft.countSeconds,
      firstBeatTimestamp: draft.firstBeatTimestamp,
      firstEightCountTimestamp: draft.firstEightCountTimestamp,
      bpmSource: draft.bpmSource,
      bpmConfidence: draft.bpmConfidence,
      bpmDetectionError: draft.bpmDetectionError,
      sections: parseSections(draft.sections, video.sections),
      labels: draft.labels.split(",").map((l) => l.trim()).filter(Boolean),
    });
    setShowEdit(false);
    reset(makeDraft(video));
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen
        options={{
          title: "Practice: " + video.title,
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable onPress={() => setShowEdit(true)}>
                <Pencil size={20} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={() => {
                  deleteVideo(video.id);
                  router.back();
                }}
              >
                <Trash2 size={20} color={colors.danger} />
              </Pressable>
            </View>
          ),
        }}
      />
      <EditVideoModal
        visible={showEdit}
        control={control}
        onClose={() => setShowEdit(false)}
        onSave={saveEdit}
      />
      
      <View style={styles.videoContainer}>
        <VideoView
          player={player}
          nativeControls={false}
          contentFit="contain"
          style={[
            styles.video,
            { transform: [{ scaleX: mirrored ? -1 : 1 }] },
          ]}
        />
      </View>

      <View style={styles.controls}>
        <VideoPlaybackControls
          mirrored={mirrored}
          onMirroredChange={setMirrored}
          onSetEightCountStart={(time) =>
            updateVideo(video.id, {
              firstEightCountTimestamp: time,
              firstBeatTimestamp: video.firstBeatTimestamp ?? time,
            })
          }
          player={player}
          video={video}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.screen, gap: spacing.screenGap },
  videoContainer: {
    overflow: "hidden",
    borderRadius: radii.xl,
    backgroundColor: colors.videoChrome,
  },
  video: { width: "100%", aspectRatio: 16 / 9 },
  controls: { gap: spacing.lg },
});
