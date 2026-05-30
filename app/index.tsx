import { useMemo, useRef, useState } from "react";
import { Alert, ScrollView } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Stack } from "expo-router";
import { createVideoPlayer } from "expo-video";
import { Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useForm, useWatch } from "react-hook-form";
import {
  AddVideoDraft,
  AddVideoModal,
} from "@/components/add-video-modal";
import { IconButton } from "@/components/icon-button";
import { LibraryControls } from "@/components/library-controls";
import { LibraryVideoList } from "@/components/library-video-list";
import {
  BpmEstimate,
  deriveBpmTiming,
  deriveDetectedBpmTiming,
  estimateBpm,
  parseBpmInput,
} from "@/lib/bpm";
import { spacing } from "@/lib/theme";
import { useVideos, VideoThumbnailSource } from "@/lib/videos";

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
  const { videos, addVideo } = useVideos();
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [bpmEstimate, setBpmEstimate] = useState<BpmEstimate | null>(null);
  const [isEstimatingBpm, setIsEstimatingBpm] = useState(false);
  const bpmRequestRef = useRef(0);
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

      const requestId = bpmRequestRef.current + 1;
      bpmRequestRef.current = requestId;
      setBpmEstimate(null);
      setIsEstimatingBpm(true);

      const estimate = await estimateBpm(asset.uri);

      if (bpmRequestRef.current === requestId) {
        setBpmEstimate(estimate);
        if (estimate.bpm) {
          setValue("bpm", estimate.bpm.toString(), { shouldDirty: true });
        }
        setIsEstimatingBpm(false);
      }
    } catch {
      Alert.alert(
        "Could not pick video",
        "Please try selecting the video again.",
      );
      setIsEstimatingBpm(false);
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
    setBpmEstimate(null);

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
          paddingBottom: spacing.screenBottom,
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
        <LibraryVideoList videos={filteredVideos} />
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
