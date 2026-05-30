import { useMemo, useState } from "react";
import { Alert, ScrollView } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Stack } from "expo-router";
import { createVideoPlayer } from "expo-video";
import { Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useForm, useWatch } from "react-hook-form";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AddVideoDraft, AddVideoModal } from "@/components/add-video-modal";
import { IconButton } from "@/components/icon-button";
import { LibraryControls } from "@/components/library-controls";
import { LibraryVideoList } from "@/components/library-video-list";
import {
  deriveBpmTiming,
  deriveDetectedBpmTiming,
  parseBpmInput,
} from "@/lib/bpm";
import { spacing } from "@/lib/theme";
import { useVideos, VideoThumbnailSource } from "@/lib/videos";
import { useBpmDetection } from "@/hooks/bpm/useBpmDetection";

const emptyVideo: AddVideoDraft = {
  title: "",
  style: "",
  teacher: "",
  sourceUri: "",
  sourceName: "",
  thumbnailUri: "",
  bpm: "100",
};

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { videos, addVideo } = useVideos();
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const {
    control,
    formState: { errors },
    getValues,
    handleSubmit,
    reset,
    setValue,
  } = useForm<AddVideoDraft>({
    defaultValues: emptyVideo,
  });
  const {
    estimate: bpmEstimate,
    isEstimating: isEstimatingBpm,
    detectBpm,
    reset: resetBpmDetection,
  } = useBpmDetection(setValue);
  const sourceName = useWatch({ control, name: "sourceName" });
  const sourceUri = useWatch({ control, name: "sourceUri" });

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesQuery = `${video.title} ${video.style} ${video.teacher}`
        .toLowerCase()
        .includes(query.toLowerCase());
      return matchesQuery && (!onlyBookmarked || video.sections.length > 0);
    });
  }, [onlyBookmarked, query, videos]);

  async function openAdd() {
    await pickVideo({ openSheet: true });
  }

  async function pickVideo({ openSheet = false } = {}) {
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
      const baseDraft = openSheet ? emptyVideo : getValues();
      const nextDraft = {
        ...baseDraft,
        title: baseDraft.title.trim() ? baseDraft.title : title,
        sourceUri: asset.uri,
        sourceName: asset.name,
      };

      if (openSheet) {
        reset(nextDraft);
      } else {
        setValue("title", nextDraft.title, { shouldDirty: true });
        setValue("sourceUri", nextDraft.sourceUri, { shouldDirty: true });
        setValue("sourceName", nextDraft.sourceName, { shouldDirty: true });
      }

      if (openSheet) {
        setShowAdd(true);
      }

      await detectBpm(asset.uri);
    } catch {
      Alert.alert(
        "Could not pick video",
        "Please try selecting the video again.",
      );
    }
  }
  async function saveDraft(draft: AddVideoDraft) {
    if (!draft.title.trim() || !draft.sourceUri.trim() || isEstimatingBpm) {
      return;
    }

    const sourceUri = draft.sourceUri.trim();
    const thumbnailUri = await resolveThumbnail(
      sourceUri,
      draft.thumbnailUri.trim(),
    );
    const bpmTiming = bpmEstimate
      ? deriveDetectedBpmTiming(bpmEstimate)
      : deriveBpmTiming(parseBpmInput(draft.bpm));

    addVideo({
      title: draft.title.trim(),
      style: draft.style.trim() || "Practice",
      teacher: draft.teacher.trim() || "Unassigned",
      sourceUri,
      thumbnailUri,
      ...bpmTiming,
      sections: [],
    });
    setShowAdd(false);
    resetBpmDetection();

    if (process.env.EXPO_OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Dance",
          headerRight: () => (
            <IconButton icon={Plus} label="Add video" onPress={openAdd} />
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: spacing.screen,
          paddingBottom: spacing.screenBottom + insets.bottom,
          gap: spacing.screenGap,
        }}
      >
        <LibraryControls
          onlyBookmarked={onlyBookmarked}
          query={query}
          videoCount={filteredVideos.length}
          onChangeOnlyBookmarked={setOnlyBookmarked}
          onChangeQuery={setQuery}
        />
        <LibraryVideoList videos={filteredVideos} onAddVideo={openAdd} />
      </ScrollView>

      <AddVideoModal
        control={control}
        errors={errors}
        estimate={bpmEstimate}
        isAnalyzing={isEstimatingBpm}
        sourceLabel={sourceName || sourceUri}
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onPickVideo={() => pickVideo()}
        onSave={handleSubmit(saveDraft)}
      />
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
