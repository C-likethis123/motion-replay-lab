
import { memo, useCallback } from "react";
import { FlipHorizontal, Pause, Play } from "lucide-react";
import { TapToBpmControl } from "./TapToBpmControl";
import { formatTime } from "../lib/bpm";
import type { DanceVideo } from "../lib/videos";
import type { WebVideoPlayer } from "../hooks/useWebVideoPlayer";
import "./VideoPlaybackControls.css";
import { TimelineMarkers } from "./TimelineMarkers";

type VideoPlaybackControlsProps = {
  player: Omit<WebVideoPlayer, "setVideoNode">;
  video: DanceVideo;
  mirrored: boolean;
  onMirroredChange: (mirrored: boolean) => void;

  showTapBpm?: boolean;
  onBpmChange?: (bpm: number) => void;
  onAddBookmark: (time: number) => void;
};

export const VideoPlaybackControls = memo(function VideoPlaybackControls({
  player,
  video,
  mirrored,
  onMirroredChange,
  showTapBpm = false,
  onBpmChange,
  onAddBookmark,
}: VideoPlaybackControlsProps) {
  const { currentTime, isPlaying, duration } = player;

  const jumpCounts = useCallback((counts: number) => {
    if (!video.countSeconds) return;
    const gridStart = video.firstEightCountTimestamp ?? video.firstBeatTimestamp ?? 0;
    const currentBeat = Math.round((currentTime - gridStart) / video.countSeconds);
    const targetBeat = currentBeat + counts;
    player.seekTo(Math.max(0, gridStart + targetBeat * video.countSeconds));
  }, [currentTime, video.countSeconds, video.firstEightCountTimestamp, video.firstBeatTimestamp, player]);

  const togglePlay = useCallback(() => {
    if (player.isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  const seek = useCallback((time: number) => {
      player.seekTo(time);
  }, [player]);

  return (
    <div className="playback-controls">
      <div className="timeline-container" style={{ position: 'relative' }}>
        <TimelineMarkers sections={video.sections} duration={duration} onSeek={seek} />
        <div className="time-display">
          <span>{formatTime(currentTime)}</span>
          <span className="bpm-display">{video.bpm ? `${video.bpm} BPM` : ""}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <input
          type="range"
          className="progress-slider"
          min={0}
          max={duration || 1}
          value={currentTime}
          onChange={(e) => player.seekTo(parseFloat(e.target.value))}
        />
      </div>

      <div className="bottom-controls">
        <div className="mirror-speed-group">
          <div className="mirror-toggle">
            <FlipHorizontal size={18} />
            <span>Mirror</span>
            <input type="checkbox" checked={mirrored} onChange={(e) => onMirroredChange(e.target.checked)} />
          </div>

          <div className="speed-controls">
            {[0.25, 0.5, 0.75, 1].map((speed) => (
              <button
                key={speed}
                className={`speed-button ${player.playbackRate === speed ? "active" : ""}`}
                onClick={() => player.setRate(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        <div className="controls-group">
          <button className="playback-button" onClick={() => jumpCounts(-8)} disabled={!video.countSeconds}>« 8</button>
          <button className="playback-button" onClick={() => jumpCounts(-1)} disabled={!video.countSeconds}>« 1</button>
          <button className="playback-button" onClick={togglePlay}>
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button className="playback-button" onClick={() => jumpCounts(1)} disabled={!video.countSeconds}>1 »</button>
          <button className="playback-button" onClick={() => jumpCounts(8)} disabled={!video.countSeconds}>8 »</button>
        </div>

        <div className="additional-controls">
          <button className="playback-button" onClick={() => onAddBookmark(currentTime)}>Bookmark</button>
          {showTapBpm && onBpmChange && (
            <TapToBpmControl
              onBpmChange={onBpmChange}
            />
          )}
        </div>
      </div>
    </div>
  );
});
