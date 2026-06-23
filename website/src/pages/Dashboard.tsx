import { useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Play, Trash2 } from "lucide-react";
import { useVideos } from "../lib/videos";
import "./Dashboard.css";

function titleFromFileName(name: string) {
  return (
    name
      .replace(/\.[^/.]+$/, "")
      .replace(/[-_]+/g, " ")
      .trim() || "Untitled video"
  );
}

function generateVideoThumbnail(file: Blob | File): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.currentTime = 0.1; // Seek slightly forward to avoid black frame

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(dataUrl);
        } else {
          resolve(null);
        }
      } catch (e) {
        console.error("Failed to generate thumbnail:", e);
        resolve(null);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    video.onerror = () => {
      console.error("Error loading video for thumbnail generation");
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
  });
}

export default function Dashboard() {
  const { videos, addVideo, deleteVideo, isLoaded } = useVideos();
  const [query, setQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      return `${video.title} ${video.labels?.join(" ") ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase());
    });
  }, [query, videos]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    for (const file of Array.from(files)) {
      const title = titleFromFileName(file.name);

      try {
        const thumbnailUri = await generateVideoThumbnail(file);

        await addVideo({
          title,
          teacher: "Unassigned",
          thumbnailUri,
          bpm: null,
          countSeconds: null,
          firstBeatTimestamp: null,
          firstEightCountTimestamp: null,
          bpmSource: "unavailable",
          bpmDetectionStatus: "detecting",
          sections: [],
          labels: [],
          mirrored: false,
        }, file);
      } catch (err) {
        console.error("Failed to import video:", err);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function triggerImport() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  async function handleDelete(id: string, title: string) {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      await deleteVideo(id);
    }
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dance Library</h1>
        
        <div className="controls-bar">
          <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
            <Search 
              size={18} 
              style={{ 
                position: "absolute", 
                left: "12px", 
                color: "var(--color-text-subtle)",
                pointerEvents: "none" 
              }} 
            />
            <input
              type="text"
              className="search-input"
              style={{ paddingLeft: "36px" }}
              placeholder="Search title or labels..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          
          <button className="btn btn-primary" onClick={triggerImport}>
            <Plus size={18} />
            <span>Import Video</span>
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="video/*"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {!isLoaded && (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-secondary)" }}>
          Loading library...
        </div>
      )}

      {isLoaded && filteredVideos.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-icon">📁</span>
          <h2 className="empty-state-title">No videos found</h2>
          <p className="empty-state-text">
            {query.trim() !== ""
              ? "No videos match your search query. Try typing something else."
              : "Your dance library is empty. Import a local video file to get started."}
          </p>
          {query.trim() === "" && (
            <button className="btn btn-primary" onClick={triggerImport}>
              <Plus size={18} />
              <span>Import Video</span>
            </button>
          )}
        </div>
      )}

      {isLoaded && filteredVideos.length > 0 && (
        <div className="video-grid">
          {filteredVideos.map((video) => {

            return (
              <div key={video.id} className="video-card">
                <div className="thumbnail-container">
                  {video.thumbnailUri ? (
                    <img src={video.thumbnailUri} alt={video.title} className="thumbnail-img" />
                  ) : (
                    <div className="thumbnail-placeholder">🎬</div>
                  )}
                </div>
                
                <div className="video-info">
                  <h3 className="video-title">{video.title}</h3>


                  {video.labels && video.labels.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-xs)", marginTop: "var(--spacing-xs)" }}>
                      {video.labels.map((label) => (
                        <span key={label} className="pill" style={{ padding: "2px var(--spacing-sm)", fontSize: "var(--font-size-xs)" }}>
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="video-actions">
                  <Link to={`/practice/${video.id}`} className="action-btn" title="Practice">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      <Play size={14} /> Practice
                    </div>
                  </Link>
                  <button 
                    onClick={() => handleDelete(video.id, video.title)} 
                    className="action-btn action-btn-danger" 
                    title="Delete"
                    style={{ background: "none", border: "none", cursor: "pointer", font: "inherit" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      <Trash2 size={14} /> Delete
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
