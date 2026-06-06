import { useParams } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { useVideos } from "../lib/videos";
import { useWebVideoPlayer } from "../hooks/useWebVideoPlayer";
import { VideoPlaybackControls } from "../components/VideoPlaybackControls";
import "./Practice.css";

export default function Practice() {
  const { id } = useParams<{ id: string }>();
  const { videos, updateVideo } = useVideos();
  const video = videos.find((item) => item.id === id);
  const videoRef = useRef<HTMLVideoElement>(null);
  const player = useWebVideoPlayer(videoRef);
  const [mirrored, setMirrored] = useState(false);
  const [activeLoop, setActiveLoop] = useState<any | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!player || !video) return;
      const countSeconds = video.countSeconds || 1;
      switch (e.key) {
        case " ": e.preventDefault(); player.isPlaying ? player.pause() : player.play(); break;
        case "m": case "M": setMirrored(!mirrored); break;
        case "ArrowLeft": player.seekBy(e.shiftKey ? -8 * countSeconds : -1 * countSeconds); break;
        case "ArrowRight": player.seekBy(e.shiftKey ? 8 * countSeconds : 1 * countSeconds); break;
        case "l": case "L": setActiveLoop(activeLoop ? null : video?.sections[0] || null); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [player, mirrored, activeLoop, video]);

  if (!video) return <div>Video not found</div>;

  return (
    <div className="practice-page">
      <div className="practice-player-container">
        <video ref={videoRef} src={video.sourceUri} style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }} />
      </div>
      
      <VideoPlaybackControls
        player={player}
        video={video}
        mirrored={mirrored}
        onMirroredChange={setMirrored}
        activeLoop={activeLoop}
        showTapBpm
        onBpmChange={(bpm) => updateVideo(video.id, { bpm })}
        onSetEightCountStart={(time) => updateVideo(video.id, { firstEightCountTimestamp: time })}
      />
      
      <div className="sections-container">
        <h3>Sections</h3>
        {video.sections.map((section, idx) => (
          <button 
            key={idx} 
            className={`section-button ${activeLoop?.start === section.start ? 'active' : ''}`}
            onClick={() => { player.seekTo(section.start); player.play(); setActiveLoop(section); }}
          >
            {section.label}
            <button onClick={(e) => { e.stopPropagation(); setActiveLoop(activeLoop?.start === section.start ? null : section); }}>
              {activeLoop?.start === section.start ? 'Unloop' : 'Loop'}
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}
