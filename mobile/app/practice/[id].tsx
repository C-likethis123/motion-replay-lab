import { useLocalSearchParams, Stack } from "expo-router";
import { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VideoPlaybackControls } from "@/components/video-playback-controls";
import { deriveBpmTiming } from "@/lib/bpm";
import { useVideos } from "@/lib/videos";
import { colors, radii, spacing } from "@/lib/theme";

export default function PracticeScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { videos, updateVideo } = useVideos();
  const video = videos.find((item) => item.id === id);
  const source = useMemo(() => (video ? { uri: video.sourceUri } : null), [video]);
  const player = useVideoPlayer(source, (createdPlayer) => {
    createdPlayer.timeUpdateEventInterval = 0.25;
  });
  const [mirrored, setMirrored] = useState(false);

  if (!video) return <Text>Video not found</Text>;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen options={{ title: "Practice: " + video.title }} />
      
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
          onBpmChange={(newBpm) => updateVideo(video.id, deriveBpmTiming(newBpm))}
          onMirroredChange={setMirrored}
          onSetEightCountStart={(time) =>
            updateVideo(video.id, {
              firstEightCountTimestamp: time,
              firstBeatTimestamp: video.firstBeatTimestamp ?? time,
            })
          }
          player={player}
          showTapBpm
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
