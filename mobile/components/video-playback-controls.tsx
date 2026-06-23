import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { useEvent, useEventListener } from "expo";
import * as Haptics from "expo-haptics";
import type { VideoPlayer } from "expo-video";
import {
  FlipHorizontal,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react-native";

import { IconButton } from "@/components/icon-button";
import { TimelineMarkers } from "@/components/timeline-markers";
import { formatBpm } from "@/lib/bpm";
import { colors, opacity, radii, spacing, typography } from "@/lib/theme";
import type { DanceVideo } from "@/lib/videos";

type VideoPlaybackControlsProps = {
  player: VideoPlayer;
  video: DanceVideo;
  mirrored: boolean;
  onMirroredChange: (mirrored: boolean) => void;
};

const speeds = [0.5, 0.75, 1, 1.25];

export function VideoPlaybackControls({
  player,
  video,
  mirrored,
  onMirroredChange,
}: VideoPlaybackControlsProps) {
  const timeUpdate = useEvent(player, "timeUpdate", {
    currentTime: player.currentTime,
    currentLiveTimestamp: player.currentLiveTimestamp,
    currentOffsetFromLive: player.currentOffsetFromLive,
    bufferedPosition: player.bufferedPosition,
  });
  const playingChange = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });
  const playbackRateChange = useEvent(player, "playbackRateChange", {
    playbackRate: player.playbackRate,
  });
  const sourceLoad = useEvent(player, "sourceLoad", null);

  const [sliderWidth, setSliderWidth] = useState(0);
  const currentTime = timeUpdate?.currentTime ?? player.currentTime;
  const duration = sourceLoad?.duration || player.duration || 0;
  const isPlaying = playingChange?.isPlaying ?? player.playing;
  const playbackRate = playbackRateChange?.playbackRate ?? player.playbackRate;
  const countSeconds = video.countSeconds;
  const gridStart = video.firstEightCountTimestamp ?? video.firstBeatTimestamp;

  useEventListener(player, "statusChange", ({ status, error }) => {
    if (status === "error") {
      console.error("Video playback failed:", error?.message);
    }
  });

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
  }

  function jump(seconds: number) {
    hapticTap();
    player.seekBy(seconds);
  }

  function jumpCounts(counts: number) {
    if (!countSeconds) {
      return;
    }

    if (gridStart == null) {
      jump(countSeconds * counts);
      return;
    }

    hapticTap();
    const currentBeat = Math.round((currentTime - gridStart) / countSeconds);
    const targetBeat = currentBeat + counts;
    // eslint-disable-next-line react-hooks/immutability
    player.currentTime = Math.max(0, gridStart + targetBeat * countSeconds);
  }

  function setSpeed(speed: number) {
    // eslint-disable-next-line react-hooks/immutability
    player.playbackRate = speed;
    hapticTap();
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.lg }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
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
              color: colors.accent,
              fontSize: typography.size.sm,
              fontWeight: typography.weight.bold,
            }}
          >
            {formatBpm(video)}
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
          onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
          style={{ position: "relative" }}
        >
          <TimelineMarkers
            sections={video.sections}
            duration={duration}
            onSeek={(time) => {
              // eslint-disable-next-line react-hooks/immutability
              player.currentTime = time;
            }}
            sliderWidth={sliderWidth}
          />
          <Slider
            minimumValue={0}
            maximumValue={duration || 1}
            value={currentTime}
            onSlidingComplete={(value) => {
              // eslint-disable-next-line react-hooks/immutability
              player.currentTime = value;
            }}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.progressTrack}
            thumbTintColor={colors.accent}
            style={{ height: 40, marginHorizontal: -spacing.md }}
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
          disabled={!countSeconds}
        />
        <IconButton
          icon={SkipBack}
          label="Back eight counts"
          onPress={() => jumpCounts(-8)}
          disabled={!countSeconds}
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
          disabled={!countSeconds}
        />
        <IconButton
          icon={SkipForward}
          label="Forward eight counts"
          onPress={() => jumpCounts(8)}
          disabled={!countSeconds}
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
          <Switch value={mirrored} onValueChange={onMirroredChange} />
        </View>

        <View style={{ flexDirection: "row", gap: spacing.md, flexWrap: "wrap" }}>
          {speeds.map((speed) => (
            <Pressable
              key={speed}
              accessibilityRole="button"
              onPress={() => setSpeed(speed)}
              style={({ pressed }) => ({
                minHeight: 36,
                paddingHorizontal: spacing.xxl,
                justifyContent: "center",
                borderRadius: radii.xl,
                backgroundColor:
                  playbackRate === speed ? colors.primary : colors.accentSoft,
                opacity: pressed ? opacity.pressed : 1,
              })}
            >
              <Text
                selectable
                style={{
                  color:
                    playbackRate === speed ? colors.primaryOn : colors.accentText,
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
    </View>
  );
}

export function formatTime(seconds: number | undefined) {
  if (!Number.isFinite(seconds) || seconds == null || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
