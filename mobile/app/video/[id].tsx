import {
  useIsFocused,
  useLocalSearchParams,
  useRouter,
  Stack,
} from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertTriangle,
  Check,
  Pencil,
  Play,
  Trash2,
} from "lucide-react-native";

import { IconButton } from "@/components/icon-button";
import { Pill } from "@/components/pill";
import {
  formatTime,
  VideoPlaybackControls,
} from "@/components/video-playback-controls";

import { colors, opacity, radii, spacing, typography } from "@/lib/theme";
import { DanceVideo, useVideos } from "@/lib/videos";

export default function VideoPracticeScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isFocused = useIsFocused();
  const { videos, updateVideo, deleteVideo } = useVideos();
  const video = videos.find((item) => item.id === id);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState(video?.title ?? "");

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



  function removeVideo() {
    deleteVideo(selectedVideo.id);
    router.back();
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () =>
            isEditingTitle ? (
              <TextInput
                value={editingTitle}
                onChangeText={setEditingTitle}
                style={{
                  fontSize: typography.size.lg,
                  fontWeight: typography.weight.bold,
                  color: colors.text,
                }}
                autoFocus
              />
            ) : (
              <Text
                style={{
                  fontSize: typography.size.lg,
                  fontWeight: typography.weight.bold,
                  color: colors.text,
                }}
              >
                {video.title}
              </Text>
            ),
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <IconButton
                icon={isEditingTitle ? Check : Pencil}
                label={isEditingTitle ? "Save title" : "Edit title"}
                onPress={() => {
                  if (isEditingTitle) {
                    updateVideo(selectedVideo.id, { title: editingTitle });
                    setIsEditingTitle(false);
                  } else {
                    setEditingTitle(selectedVideo.title);
                    setIsEditingTitle(true);
                  }
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
    createdPlayer.timeUpdateEventInterval = 1;
    createdPlayer.bufferOptions = {
      preferredForwardBufferDuration: 45,
      minBufferForPlayback: 4,
      prioritizeTimeOverSizeThreshold: true,
    };
  });
  const [mirrored, setMirrored] = useState(false);

  function jumpTo(time: number) {
    // eslint-disable-next-line react-hooks/immutability
    player.currentTime = Math.max(0, time);
  }

  function deleteSection(sectionId: string) {
    onUpdateVideo(video.id, {
      sections: video.sections.filter((section) => section.id !== sectionId),
    });
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
        mirrored={mirrored}
        onMirroredChange={setMirrored}
        player={player}
        video={video}
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" }}>
        {video.labels.map((label) => (
          <Pill key={label} label={label} />
        ))}
        <IconButton
          icon={Pencil}
          label="Edit tags"
          onPress={() => {
            // Need a way to edit tags here.
            // For now, let's just log for simplicity as a placeholder
            console.log("Edit tags pressed");
          }}
        />
      </View>

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
        {video.sections.length === 0 ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.size.md,
            }}
          >
            No sections yet.
          </Text>
        ) : (
          video.sections.map((section) => {
            return (
              <Pressable
                key={section.id}
                accessibilityRole="button"
                onPress={() => jumpTo(section.start)}
                style={({ pressed }) => ({
                  padding: spacing.xxl,
                  gap: spacing.lg,
                  borderRadius: radii.lg,
                  borderCurve: "continuous",
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
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
                    icon={Trash2}
                    label="Delete"
                    tone="danger"
                    onPress={() => deleteSection(section.id)}
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
          })
        )}
      </View>
    </ScrollView>
  );
}
