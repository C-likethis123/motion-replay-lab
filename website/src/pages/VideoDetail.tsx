import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useVideos } from "../lib/videos";
import { useWebVideoPlayer } from "../hooks/useWebVideoPlayer";
import { VideoPlaybackControls } from "../components/VideoPlaybackControls";
import "./VideoDetail.css";

export default function VideoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { videos, updateVideo, deleteVideo } = useVideos();
  const video = videos.find((item) => item.id === id);
  const videoRef = useRef<HTMLVideoElement>(null);
  const player = useWebVideoPlayer(videoRef);
  const [mirrored, setMirrored] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: video?.title || "",
    sections: video?.sections.map(s => `${s.label}, ${s.start}, ${s.end}`).join("\n") || "",
    labels: video?.labels?.join(", ") || "",
  });

  if (!video) {
    return <div>Video not found</div>;
  }

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
    <div className="video-detail-container">
      <div className="video-container" style={{ aspectRatio: "16/9", backgroundColor: "#000" }}>
        <video
          ref={videoRef}
          src={video.sourceUri}
          style={{ 
            width: "100%", 
            height: "100%", 
            transform: mirrored ? "scaleX(-1)" : "scaleX(1)",
            objectFit: "contain"
          }}
          controls={false}
        />
      </div>

      <VideoPlaybackControls
        player={player}
        video={video}
        mirrored={mirrored}
        onMirroredChange={setMirrored}
      />

      {video.labels && video.labels.length > 0 && (
        <div style={{ marginTop: "var(--spacing-md)", display: "flex", gap: "var(--spacing-sm)" }}>
          {video.labels.map((label) => (
            <span key={label} className="pill">
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="actions">
        <button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? "Cancel" : "Edit Video"}
        </button>
        <button onClick={handleDelete} className="danger">
          Delete Video
        </button>
      </div>
      
      {isEditing && (
        <div className="edit-form">
          <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Title" />
          <input value={editForm.labels} onChange={e => setEditForm({...editForm, labels: e.target.value})} placeholder="Labels (comma separated)" />
          <textarea value={editForm.sections} onChange={e => setEditForm({...editForm, sections: e.target.value})} placeholder="Sections (Label, Start, End)" />
          <button onClick={handleSave}>Save</button>
        </div>
      )}
    </div>
  );
}
