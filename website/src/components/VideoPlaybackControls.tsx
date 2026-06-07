import { useEffect, useState } from "react";
import { Flag, FlipHorizontal, Pause, Play } from "lucide-react";
import { TapToBpmControl } from "./TapToBpmControl";
import { formatTime } from "../lib/bpm";
import type { DanceVideo } from "../lib/videos";
import type { PracticeSection } from "../lib/db";
import "./VideoPlaybackControls.css";

type VideoPlaybackControlsProps = {
  player: any;
  video: DanceVideo;
  mirrored: boolean;
  onMirroredChange: (mirrored: boolean) => void;
  activeLoop?: PracticeSection | null;
  showTapBpm?: boolean;
  onBpmChange?: (bpm: number) => void;
  onSetEightCountStart?: (time: number) => void;
};

export function VideoPlaybackControls({
  player,
  video,
  mirrored,
  onMirroredChange,
  activeLoop = null,
  showTapBpm = false,
  onBpmChange,
  onSetEightCountStart,
}: VideoPlaybackControlsProps) {
  const [isPlaying, setIsPlaying] = useState(player.isPlaying);
  const [currentTime, setCurrentTime] = useState(player.currentTime);
  const [duration, setDuration] = useState(player.duration);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(player.currentTime || 0);
      setDuration(player.duration || 0);
      setIsPlaying(player.isPlaying);

      if (activeLoop && player.currentTime >= activeLoop.end) {
        player.seekTo(activeLoop.start);
        player.play();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [activeLoop, player]);

  function jumpCounts(counts: number) {
    if (!video.countSeconds) return;
    const gridStart = video.firstEightCountTimestamp ?? video.firstBeatTimestamp ?? 0;
    const currentBeat = Math.round((currentTime - gridStart) / video.countSeconds);
    const targetBeat = currentBeat + counts;
    player.seekTo(Math.max(0, gridStart + targetBeat * video.countSeconds));
  }

  return (
    <div className="playback-controls">
      <div className="timeline-container">
        <div className="time-display">
          <span>{formatTime(currentTime)}</span>
          <span className="bpm-display">{video.bpm ? `${video.bpm} BPM` : ""}</span>
          <span>{formatTime(duration)}</span>
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

      <div className="controls-buttons">
        <button onClick={() => jumpCounts(-8)} disabled={!video.countSeconds}>« 8</button>
        <button onClick={() => jumpCounts(-1)} disabled={!video.countSeconds}>« 1</button>
        <button onClick={() => isPlaying ? player.pause() : player.play()}>
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button onClick={() => jumpCounts(1)} disabled={!video.countSeconds}>1 »</button>
        <button onClick={() => jumpCounts(8)} disabled={!video.countSeconds}>8 »</button>
      </div>
      
      <div className="additional-controls">
        {video.countSeconds && onSetEightCountStart && (
          <button className="secondary-button" onClick={() => onSetEightCountStart(currentTime)}>
            <Flag size={16} /> Set Count One
          </button>
        )}

        {showTapBpm && onBpmChange && (
          <TapToBpmControl
            initialBpm={video.bpm ?? 120}
            onBpmChange={onBpmChange}
          />
        )}
      </div>

      <div className="mirror-speed-container">
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
    </div>
  );
}
