import { useParams, useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { useVideos } from "../lib/videos";
import { useWebVideoPlayer } from "../hooks/useWebVideoPlayer";
import { VideoPlaybackControls } from "../components/VideoPlaybackControls";
import "./Practice.css";

export default function Practice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { videos, updateVideo, deleteVideo } = useVideos();
  const video = videos.find((item) => item.id === id);
  const videoRef = useRef<HTMLVideoElement>(null);
  const player = useWebVideoPlayer(videoRef);
  const [mirrored, setMirrored] = useState(false);
  const [activeLoop, setActiveLoop] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: video?.title || "",
    sections: video?.sections.map(s => `${s.label}, ${s.start}, ${s.end}`).join("\n") || "",
    labels: video?.labels?.join(", ") || "",
  });

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

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this video?")) {
      await deleteVideo(video.id);
      navigate("/");
    }
  };

  const handleSave = async () => {
    const sections = editForm.sections.split("\n").map((line, index) => {
      const [label, start, end] = line.split(",").map((part) => part.trim());
      return { id: `${label || "section"}-${index}`, label, start: Number(start), end: Number(end) };
    }).filter(s => s.label && !isNaN(s.start) && !isNaN(s.end));
    
    await updateVideo(video.id, {
      title: editForm.title,
      sections,
      labels: editForm.labels.split(",").map(l => l.trim()).filter(l => l !== "")
    });
    setIsEditing(false);
  };

  return (
    <div className="practice-page">
      <div className="practice-header">
        <h2>{video.title}</h2>
        <div className="actions">
            <button onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? "Cancel" : "Edit"}
            </button>
            <button onClick={handleDelete} className="danger">
              Delete
            </button>
        </div>
      </div>

      {isEditing && (
        <div className="edit-form" style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ccc' }}>
          <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Title" />
          <input value={editForm.labels} onChange={e => setEditForm({...editForm, labels: e.target.value})} placeholder="Labels (comma separated)" />
          <textarea value={editForm.sections} onChange={e => setEditForm({...editForm, sections: e.target.value})} placeholder="Sections (Label, Start, End)" />
          <button onClick={handleSave}>Save</button>
        </div>
      )}

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
