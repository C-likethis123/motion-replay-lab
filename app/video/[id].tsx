import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import * as Haptics from "expo-haptics";
import {
  FlipHorizontal,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Trash2,
  X,
} from "lucide-react-native";
import { IconButton } from "@/components/icon-button";
import { DanceVideo, PracticeSection, useVideos } from "@/lib/videos";

const speeds = [0.5, 0.75, 1, 1.25];

export default function VideoPracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { videos, updateVideo, deleteVideo } = useVideos();
  const video = videos.find((item) => item.id === id);
  const source = useMemo(() => (video ? { uri: video.sourceUri } : null), [video]);
  const player = useVideoPlayer(source, (createdPlayer) => {
    createdPlayer.timeUpdateEventInterval = 0.25;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mirrored, setMirrored] = useState(false);
  const [activeLoop, setActiveLoop] = useState<PracticeSection | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [draft, setDraft] = useState(() => makeDraft(video));

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
          contentContainerStyle={{ padding: 20, gap: 16 }}
        >
          <Text selectable style={{ color: "#1f2a2e", fontSize: 22, fontWeight: "700" }}>
            Video not found
          </Text>
        </ScrollView>
      </>
    );
  }

  const selectedVideo = video;

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

  function jumpTo(time: number) {
    hapticTap();
    // eslint-disable-next-line react-hooks/immutability
    player.currentTime = Math.max(0, time);
  }

  function saveEdit() {
    updateVideo(selectedVideo.id, {
      title: draft.title.trim() || selectedVideo.title,
      style: draft.style.trim() || selectedVideo.style,
      teacher: draft.teacher.trim() || selectedVideo.teacher,
      sourceUri: draft.sourceUri.trim() || selectedVideo.sourceUri,
      thumbnailUri: draft.thumbnailUri.trim() || selectedVideo.thumbnailUri,
      bpm: Number(draft.bpm) || selectedVideo.bpm,
      countSeconds: 60 / (Number(draft.bpm) || selectedVideo.bpm),
      sections: parseSections(draft.sections, selectedVideo.sections),
    });
    setShowEdit(false);
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
            <View style={{ flexDirection: "row", gap: 8 }}>
              <IconButton
                icon={Pencil}
                label="Edit video"
                onPress={() => {
                  setDraft(makeDraft(selectedVideo));
                  setShowEdit(true);
                }}
              />
              <IconButton icon={Trash2} label="Delete video" tone="danger" onPress={removeVideo} />
            </View>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20, paddingBottom: 42, gap: 18 }}
      >
        <View
          style={{
            overflow: "hidden",
            borderRadius: 18,
            borderCurve: "continuous",
            backgroundColor: "#111719",
            borderWidth: 1,
            borderColor: "#242d30",
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

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Text selectable style={{ color: "#1f2a2e", fontSize: 18, fontWeight: "700" }}>
              {formatTime(currentTime)}
            </Text>
            <Text selectable style={{ color: "#736b61", fontSize: 18, fontVariant: ["tabular-nums"] }}>
              {formatTime(duration)}
            </Text>
          </View>
          <View
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: "#dfd8ce",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%`,
                height: "100%",
                backgroundColor: "#52796f",
              }}
            />
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 12 }}>
          <IconButton icon={SkipBack} label="Back one count" onPress={() => jump(-video.countSeconds)} />
          <IconButton icon={SkipBack} label="Back eight count" onPress={() => jump(-video.countSeconds * 8)} />
          <IconButton
            icon={isPlaying ? Pause : Play}
            label={isPlaying ? "Pause" : "Play"}
            tone="primary"
            onPress={togglePlay}
            style={{ minWidth: 64 }}
          />
          <IconButton icon={SkipForward} label="Forward one count" onPress={() => jump(video.countSeconds)} />
          <IconButton icon={SkipForward} label="Forward eight count" onPress={() => jump(video.countSeconds * 8)} />
        </View>

        <View
          style={{
            padding: 14,
            gap: 14,
            borderRadius: 16,
            borderCurve: "continuous",
            backgroundColor: "#ffffff",
            borderWidth: 1,
            borderColor: "#ded7cc",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <FlipHorizontal size={18} color="#52796f" />
              <Text selectable style={{ color: "#1f2a2e", fontSize: 16, fontWeight: "700" }}>
                Mirror
              </Text>
            </View>
            <Switch value={mirrored} onValueChange={setMirrored} />
          </View>

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
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
                  paddingHorizontal: 14,
                  justifyContent: "center",
                  borderRadius: 18,
                  backgroundColor: player.playbackRate === speed ? "#1f2a2e" : "#edf1e7",
                  opacity: pressed ? 0.72 : 1,
                })}
              >
                <Text
                  selectable
                  style={{
                    color: player.playbackRate === speed ? "#ffffff" : "#405043",
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  {speed}x
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Text selectable style={{ color: "#1f2a2e", fontSize: 20, fontWeight: "700" }}>
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
                  padding: 14,
                  gap: 10,
                  borderRadius: 16,
                  borderCurve: "continuous",
                  backgroundColor: selected ? "#e4eee8" : "#ffffff",
                  borderWidth: 1,
                  borderColor: selected ? "#91aa9d" : "#ded7cc",
                  opacity: pressed ? 0.78 : 1,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text selectable style={{ color: "#1f2a2e", fontSize: 16, fontWeight: "700" }}>
                    {section.label}
                  </Text>
                  <IconButton
                    icon={RotateCcw}
                    label={selected ? "Stop loop" : "Loop section"}
                    tone={selected ? "primary" : "plain"}
                    onPress={() => setActiveLoop(selected ? null : section)}
                  />
                </View>
                <Text selectable style={{ color: "#6f665c", fontSize: 14, fontVariant: ["tabular-nums"] }}>
                  {formatTime(section.start)} - {formatTime(section.end)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Modal animationType="slide" presentationStyle="pageSheet" visible={showEdit}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 20, gap: 14, backgroundColor: "#f8f4ee" }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text selectable style={{ color: "#1f2a2e", fontSize: 24, fontWeight: "700" }}>
              Edit video
            </Text>
            <IconButton icon={X} label="Close" onPress={() => setShowEdit(false)} />
          </View>
          <VideoField label="Title" value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} />
          <VideoField label="Style" value={draft.style} onChangeText={(style) => setDraft({ ...draft, style })} />
          <VideoField label="Teacher" value={draft.teacher} onChangeText={(teacher) => setDraft({ ...draft, teacher })} />
          <VideoField label="Video URL" value={draft.sourceUri} onChangeText={(sourceUri) => setDraft({ ...draft, sourceUri })} />
          <VideoField label="Thumbnail URL" value={draft.thumbnailUri} onChangeText={(thumbnailUri) => setDraft({ ...draft, thumbnailUri })} />
          <VideoField label="BPM" value={draft.bpm} keyboardType="number-pad" onChangeText={(bpm) => setDraft({ ...draft, bpm })} />
          <VideoField
            label="Sections"
            value={draft.sections}
            multiline
            onChangeText={(sections) => setDraft({ ...draft, sections })}
          />
          <Pressable
            accessibilityRole="button"
            onPress={saveEdit}
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
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>Save changes</Text>
          </Pressable>
        </ScrollView>
      </Modal>
    </>
  );
}

function makeDraft(video?: DanceVideo) {
  return {
    title: video?.title ?? "",
    style: video?.style ?? "",
    teacher: video?.teacher ?? "",
    sourceUri: video?.sourceUri ?? "",
    thumbnailUri: video?.thumbnailUri ?? "",
    bpm: `${video?.bpm ?? 100}`,
    sections:
      video?.sections.map((section) => `${section.label}, ${section.start}, ${section.end}`).join("\n") ?? "",
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
    .filter((section) => section.label && Number.isFinite(section.start) && Number.isFinite(section.end));

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

function VideoField({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "number-pad";
  multiline?: boolean;
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
        multiline={multiline}
        autoCapitalize="none"
        style={{
          minHeight: multiline ? 124 : 48,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 0,
          borderRadius: 12,
          borderCurve: "continuous",
          backgroundColor: "#ffffff",
          borderWidth: 1,
          borderColor: "#d8d1c7",
          color: "#1f2a2e",
          fontSize: 16,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}
