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
import { Image } from "expo-image";
import { Link, Stack } from "expo-router";
import { FileVideo, Plus, Search, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { IconButton } from "@/components/icon-button";
import { deriveBpmTiming, formatBpm } from "@/lib/bpm";
import { DanceVideo, useVideos } from "@/lib/videos";

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
      Alert.alert("Could not pick video", "Please try selecting the video again.");
    }
  }

  function saveDraft() {
    if (!draft.title.trim() || !draft.sourceUri.trim()) {
      return;
    }

    addVideo({
      title: draft.title.trim(),
      style: draft.style.trim() || "Practice",
      teacher: draft.teacher.trim() || "Unassigned",
      sourceUri: draft.sourceUri.trim(),
      thumbnailUri:
        draft.thumbnailUri.trim() ||
        "https://images.unsplash.com/photo-1519925610903-381054cc2a1c?auto=format&fit=crop&w=900&q=80",
      ...deriveBpmTiming(draft.bpm),
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
          headerRight: () => <IconButton icon={Plus} label="Add video" onPress={openAdd} />,
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
            borderRadius: 14,
            borderCurve: "continuous",
            backgroundColor: "#ffffff",
            borderWidth: 1,
            borderColor: "#ded7cc",
          }}
        >
          <Search size={18} color="#746c62" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search videos"
            placeholderTextColor="#8f867b"
            style={{ flex: 1, color: "#1f2a2e", fontSize: 16 }}
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
            <Text selectable style={{ color: "#756d63", fontSize: 13 }}>
              Playlist
            </Text>
            <Text
              selectable
              style={{ color: "#1f2a2e", fontSize: 28, fontWeight: "700", marginTop: 2 }}
            >
              {filteredVideos.length} videos
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text selectable style={{ color: "#4f5b53", fontSize: 14 }}>
              Loops
            </Text>
            <Switch value={onlyBookmarked} onValueChange={setOnlyBookmarked} />
          </View>
        </View>

        <View style={{ gap: 12 }}>
          {filteredVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </View>
      </ScrollView>

      <Modal animationType="slide" presentationStyle="pageSheet" visible={showAdd}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 20, gap: 14, backgroundColor: "#f8f4ee" }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text selectable style={{ color: "#1f2a2e", fontSize: 24, fontWeight: "700" }}>
              Add video
            </Text>
            <IconButton icon={X} label="Close" onPress={() => setShowAdd(false)} />
          </View>
          <VideoField label="Title" value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} />
          <VideoField label="Style" value={draft.style} onChangeText={(style) => setDraft({ ...draft, style })} />
          <VideoField label="Teacher" value={draft.teacher} onChangeText={(teacher) => setDraft({ ...draft, teacher })} />
          <PickerField
            label="Video"
            value={draft.sourceName || draft.sourceUri}
            onPress={() => pickVideo()}
          />
          <VideoField label="Thumbnail URL" value={draft.thumbnailUri} onChangeText={(thumbnailUri) => setDraft({ ...draft, thumbnailUri })} />
          <VideoField
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
              borderRadius: 14,
              borderCurve: "continuous",
              backgroundColor: "#1f2a2e",
              opacity: pressed ? 0.78 : 1,
            })}
          >
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>Save video</Text>
          </Pressable>
        </ScrollView>
      </Modal>
    </>
  );
}

function titleFromFileName(name: string) {
  return name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim() || "Untitled video";
}

function VideoCard({ video }: { video: DanceVideo }) {
  return (
    <Link href={`/video/${video.id}`} asChild>
      <Pressable
        style={({ pressed }) => ({
          flexDirection: "row",
          gap: 12,
          padding: 10,
          borderRadius: 16,
          borderCurve: "continuous",
          backgroundColor: "#ffffff",
          borderWidth: 1,
          borderColor: "#ded7cc",
          opacity: pressed ? 0.82 : 1,
          boxShadow: "0 1px 2px rgba(31, 42, 46, 0.06)",
        })}
      >
        <Image
          source={{ uri: video.thumbnailUri }}
          style={{ width: 104, aspectRatio: 1.1, borderRadius: 12 }}
          contentFit="cover"
        />
        <View style={{ flex: 1, justifyContent: "space-between", minHeight: 94 }}>
          <View style={{ gap: 4 }}>
            <Text selectable style={{ color: "#1f2a2e", fontSize: 18, fontWeight: "700" }}>
              {video.title}
            </Text>
            <Text selectable style={{ color: "#6f665c", fontSize: 14 }}>
              {video.style} - {video.teacher}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Pill label={formatBpm(video)} />
            <Pill label={`${video.sections.length} loops`} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 9,
        minHeight: 26,
        justifyContent: "center",
        borderRadius: 13,
        backgroundColor: "#edf1e7",
      }}
    >
      <Text selectable style={{ color: "#405043", fontSize: 12, fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
}

function PickerField({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text selectable style={{ color: "#625a51", fontSize: 13, fontWeight: "600" }}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 48,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderRadius: 12,
          borderCurve: "continuous",
          backgroundColor: "#ffffff",
          borderWidth: 1,
          borderColor: "#d8d1c7",
          opacity: pressed ? 0.78 : 1,
        })}
      >
        <FileVideo size={18} color="#625a51" />
        <Text
          numberOfLines={1}
          style={{ flex: 1, color: value ? "#1f2a2e" : "#8f867b", fontSize: 16 }}
        >
          {value || "Choose video"}
        </Text>
      </Pressable>
    </View>
  );
}

function VideoField({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text selectable style={{ color: "#625a51", fontSize: 13, fontWeight: "600" }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="none"
        style={{
          minHeight: 48,
          paddingHorizontal: 14,
          borderRadius: 12,
          borderCurve: "continuous",
          backgroundColor: "#ffffff",
          borderWidth: 1,
          borderColor: "#d8d1c7",
          color: "#1f2a2e",
          fontSize: 16,
        }}
      />
    </View>
  );
}
