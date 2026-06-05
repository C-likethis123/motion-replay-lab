import { useMemo, useState } from "react";
import { Alert, ScrollView } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Stack } from "expo-router";
import { createVideoPlayer } from "expo-video";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LibraryControls } from "@/components/library-controls";
import { LibraryVideoList } from "@/components/library-video-list";
import { deriveDetectedBpmTiming, estimateBpm } from "@/lib/bpm";
import { spacing } from "@/lib/theme";
import { useVideos, VideoThumbnailSource } from "@/lib/videos";

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { videos, addVideo, updateVideo } = useVideos();
  const [query, setQuery] = useState("");

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      return `${video.title} ${video.style} ${video.teacher}`
        .toLowerCase()
        .includes(query.toLowerCase());
    });
  }, [query, videos]);

  async function openAdd() {
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
      const title = titleFromFileName(asset.name);
      const thumbnailUri = await resolveThumbnail(asset.uri, "");

      const videoId = addVideo({
        title,
        style: "Practice",
        teacher: "Unassigned",
        sourceUri: asset.uri,
        thumbnailUri,
        bpm: null,
        countSeconds: null,
        firstBeatTimestamp: null,
        firstEightCountTimestamp: null,
        bpmSource: "unavailable",
        bpmDetectionStatus: "detecting",
        sections: [],
      });

      estimateBpm(asset.uri)
        .then((bpmEstimate) => {
          updateVideo(videoId, {
            ...deriveDetectedBpmTiming(bpmEstimate),
            bpmDetectionStatus: "idle",
            bpmDetectionError: bpmEstimate.error,
          });
        })
        .catch((error) => {
          console.error(error);
          updateVideo(videoId, {
            bpmDetectionStatus: "idle",
            bpmDetectionError:
              error instanceof Error ? error.message : String(error),
          });
        });

      if (process.env.EXPO_OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Could not add video",
        "Please try selecting the video again.",
      );
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: spacing.screen,
          paddingTop: spacing.screen + insets.top,
          paddingBottom: spacing.screenBottom + insets.bottom,
          gap: spacing.screenGap,
        }}
      >
        <LibraryControls
          query={query}
          videoCount={filteredVideos.length}
          onChangeQuery={setQuery}
          onAddVideo={openAdd}
        />
        <LibraryVideoList videos={filteredVideos} query={query} />
      </ScrollView>
    </>
  );
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

function titleFromFileName(name: string) {
  return (
    name
      .replace(/\.[^/.]+$/, "")
      .replace(/[-_]+/g, " ")
      .trim() || "Untitled video"
  );
}
