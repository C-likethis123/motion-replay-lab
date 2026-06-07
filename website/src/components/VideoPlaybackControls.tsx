import { useEffect, useState } from "react";
import { Flag, FlipHorizontal, Pause, Play } from "lucide-react";
import { TapToBpmControl } from "./TapToBpmControl";
import { formatTime } from "../lib/bpm";
import type { DanceVideo } from "../lib/videos";
import type { PracticeSection } from "../lib/db";
import "./VideoPlaybackControls.css";
import { TimelineMarkers } from "./TimelineMarkers";

type VideoPlaybackControlsProps = {
  player: any;
  video: DanceVideo;
  mirrored: boolean;
  onMirroredChange: (mirrored: boolean) => void;

  showTapBpm?: boolean;
  onBpmChange?: (bpm: number) => void;
  onAddBookmark: (time: number) => void;

};

export function VideoPlaybackControls({
  player,
  video,
  mirrored,
  onMirroredChange,
  showTapBpm = false,
  onBpmChange,
  onAddBookmark,
}: VideoPlaybackControlsProps) {
  const { currentTime, isPlaying, duration } = player;



  function jumpCounts(counts: number) {
    if (!video.countSeconds) return;
    const gridStart = video.firstEightCountTimestamp ?? video.firstBeatTimestamp ?? 0;
    const currentBeat = Math.round((currentTime - gridStart) / video.countSeconds);
    const targetBeat = currentBeat + counts;
    player.seekTo(Math.max(0, gridStart + targetBeat * video.countSeconds));
  }

  return (
    <div className="playback-controls">
      <div className="timeline-container" style={{ position: 'relative' }}>
        <TimelineMarkers sections={video.sections} duration={player.duration} onSeek={(time) => player.seekTo(time)} />
        <div className="time-display">
          <span>{formatTime(player.currentTime)}</span>
          <span className="bpm-display">{video.bpm ? `${video.bpm} BPM` : ""}</span>
          <span>{formatTime(player.duration)}</span>
        </div>
        <input
          type="range"
          className="progress-slider"
          min={0}
          max={player.duration || 1}
          value={player.currentTime}
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
            {[0.5, 0.75, 1, 1.25].map((speed) => (
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
          <button onClick={() => jumpCounts(-8)} disabled={!video.countSeconds}>« 8</button>
          <button onClick={() => jumpCounts(-1)} disabled={!video.countSeconds}>« 1</button>
          <button onClick={() => player.isPlaying ? player.pause() : player.play()}>
            {player.isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button onClick={() => jumpCounts(1)} disabled={!video.countSeconds}>1 »</button>
          <button onClick={() => jumpCounts(8)} disabled={!video.countSeconds}>8 »</button>
        </div>

        <div className="additional-controls">
          <button onClick={() => onAddBookmark(player.currentTime)}>Bookmark</button>
          {showTapBpm && onBpmChange && (
            <TapToBpmControl
              initialBpm={video.bpm ?? 120}
              onBpmChange={onBpmChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
