import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Link, Stack } from "expo-router";
import { createVideoPlayer } from "expo-video";
import { FileVideo, Plus, Search, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Card } from "@/components/card";
import { IconButton } from "@/components/icon-button";
import { LabelledTextInput } from "@/components/labelled-text-input";
import { PickerField } from "@/components/picker-field";
import { Pill } from "@/components/pill";
import { deriveBpmTiming, formatBpm, parseBpmInput } from "@/lib/bpm";
import { colors, opacity, radii } from "@/lib/theme";
import { useVideos, VideoThumbnailSource } from "@/lib/videos";
import { pluralise } from "@/utils/i18n";

const emptyVideo = {
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
  const [draft, setDraft] = useState(emptyVideo);

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

      setDraft((current) => {
        const baseDraft = openSheet ? emptyVideo : current;

        return {
          ...baseDraft,
          title: baseDraft.title.trim() ? baseDraft.title : title,
          sourceUri: asset.uri,
          sourceName: asset.name,
        };
      });

      if (openSheet) {
        setShowAdd(true);
      }
    } catch {
      Alert.alert(
        "Could not pick video",
        "Please try selecting the video again.",
      );
    }
  }
  async function saveDraft() {
    if (!draft.title.trim() || !draft.sourceUri.trim()) {
      return;
    }

    const sourceUri = draft.sourceUri.trim();
    const thumbnailUri = await resolveThumbnail(
      sourceUri,
      draft.thumbnailUri.trim(),
    );

    addVideo({
      title: draft.title.trim(),
      style: draft.style.trim() || "Practice",
      teacher: draft.teacher.trim() || "Unassigned",
      sourceUri,
      thumbnailUri,
      ...deriveBpmTiming(parseBpmInput(draft.bpm)),
      sections: [],
    });
    setShowAdd(false);

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
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 18 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 14,
            minHeight: 48,
            borderRadius: radii.md,
            borderCurve: "continuous",
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.borderStrong,
          }}
        >
          <Search size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search videos"
            placeholderTextColor={colors.textSubtle}
            style={{ flex: 1, color: colors.text, fontSize: 16 }}
          />
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <View>
            <Text selectable style={{ color: colors.textMuted, fontSize: 13 }}>
              Playlist
            </Text>
            <Text
              selectable
              style={{
                color: colors.text,
                fontSize: 28,
                fontWeight: "700",
                marginTop: 2,
              }}
            >
              {filteredVideos.length} videos
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text selectable style={{ color: colors.accentText, fontSize: 14 }}>
              Loops
            </Text>
            <Switch value={onlyBookmarked} onValueChange={setOnlyBookmarked} />
          </View>
        </View>

        <View style={{ gap: 12 }}>
          {filteredVideos.map((video) => (
            <Link key={video.id} href={`/video/${video.id}`} asChild>
              <Card>
                <Card.Image
                  source={video.thumbnailUri}
                  fallback={<FileVideo size={24} color={colors.accentText} />}
                />
                <Card.Content>
                  <View style={{ gap: 4 }}>
                    <Card.Title>{video.title}</Card.Title>
                    <Card.Description>
                      {video.style} - {video.teacher}
                    </Card.Description>
                  </View>
                  <Card.Footer>
                    <Pill label={formatBpm(video)} />
                    <Pill
                      label={`${pluralise(video.sections.length, "loop")}`}
                    />
                  </Card.Footer>
                </Card.Content>
              </Card>
            </Link>
          ))}
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
        visible={showAdd}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            padding: 20,
            gap: 14,
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
              style={{ color: colors.text, fontSize: 24, fontWeight: "700" }}
            >
              Add video
            </Text>
            <IconButton
              icon={X}
              label="Close"
              onPress={() => setShowAdd(false)}
            />
          </View>
          <LabelledTextInput
            label="Title"
            value={draft.title}
            onChangeText={(title) => setDraft({ ...draft, title })}
          />
          <LabelledTextInput
            label="Style (optional)"
            value={draft.style}
            onChangeText={(style) => setDraft({ ...draft, style })}
          />
          <LabelledTextInput
            label="Teacher"
            value={draft.teacher}
            onChangeText={(teacher) => setDraft({ ...draft, teacher })}
          />
          <PickerField
            label="Video"
            value={draft.sourceName || draft.sourceUri}
            placeholder="Choose video"
            leftAccessory={<FileVideo size={18} color={colors.textSecondary} />}
            onPress={() => pickVideo()}
          />
          <LabelledTextInput
            label="Thumbnail URL"
            value={draft.thumbnailUri}
            onChangeText={(thumbnailUri) =>
              setDraft({ ...draft, thumbnailUri })
            }
          />
          <LabelledTextInput
            label="BPM"
            value={draft.bpm}
            keyboardType="number-pad"
            onChangeText={(bpm) => setDraft({ ...draft, bpm })}
          />
          <Pressable
            accessibilityRole="button"
            onPress={saveDraft}
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
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              Save video
            </Text>
          </Pressable>
        </ScrollView>
      </Modal>
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
