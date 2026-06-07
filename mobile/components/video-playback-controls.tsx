import { useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import type { VideoPlayer } from "expo-video";
import {
  Flag,
  FlipHorizontal,
  Pause,
  Play,
  SkipBack,
  SkipForward,
import { IconButton } from "@/components/icon-button";
import { TimelineMarkers } from "@/components/timeline-markers";
import { TapToBpmControl } from "@/components/tap-to-bpm-control";
// ... existing imports

export function VideoPlaybackControls({
  player,
  video,
  mirrored,
  onMirroredChange,


}: VideoPlaybackControlsProps) {
  const [isPlaying, setIsPlaying] = useState(player.playing);
  const [currentTime, setCurrentTime] = useState(player.currentTime);
  const [duration, setDuration] = useState(player.duration);
  const [playbackRate, setPlaybackRate] = useState(player.playbackRate);
  const [sliderWidth, setSliderWidth] = useState(0);
  const countSeconds = video.countSeconds;
// ...

  const gridStart = video.firstEightCountTimestamp ?? video.firstBeatTimestamp;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(player.currentTime || 0);
      setDuration(player.duration || 0);
      setIsPlaying(player.playing);
      setPlaybackRate(player.playbackRate);


    }, 250);

    return () => clearInterval(interval);
  }, [player]);

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
    setPlaybackRate(speed);
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
          onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
          style={{ position: 'relative' }}>
          <TimelineMarkers sections={video.sections} duration={duration} onSeek={(time) => (player.currentTime = time)} sliderWidth={sliderWidth} />
          <Slider
            minimumValue={0}
            maximumValue={duration || 1}
            value={currentTime}
            onSlidingComplete={(value) => (player.currentTime = value)}
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
          label="Back eight count"
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
          label="Forward eight count"
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

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
