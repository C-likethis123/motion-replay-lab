import { useParams, useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { useVideos } from "../lib/videos";
import { useWebVideoPlayer } from "../hooks/useWebVideoPlayer";
import { VideoPlaybackControls } from "../components/VideoPlaybackControls";
import { TagsInput } from "../components/TagsInput";
import { SectionEditor } from "../components/SectionEditor";
import "./Practice.css";

export default function Practice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { videos, updateVideo, deleteVideo } = useVideos();
  const video = videos.find((item) => item.id === id);
  const videoRef = useRef<HTMLVideoElement>(null);
  const player = useWebVideoPlayer(videoRef);
  const [mirrored, setMirrored] = useState(video?.mirrored ?? false);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState(video?.title || "");
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingNotes, setEditingNotes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (video) {
      setMirrored(video.mirrored);
    }
  }, [video]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!player || !video || isEditingTitle || isEditingTags) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const countSeconds = video.countSeconds || 1;
      switch (e.key) {
        case " ": e.preventDefault(); player.isPlaying ? player.pause() : player.play(); break;
        case "m": case "M": {
          const newMirrored = !mirrored;
          setMirrored(newMirrored);
          updateVideo(video.id, { mirrored: newMirrored });
          break;
        }
        case "ArrowLeft": player.seekBy(e.shiftKey ? -8 * countSeconds : -1 * countSeconds); break;
        case "ArrowRight": player.seekBy(e.shiftKey ? 8 * countSeconds : 1 * countSeconds); break;
        case "0": case "1": case "2": case "3": case "4":
        case "5": case "6": case "7": case "8": case "9":
          player.seekTo((parseInt(e.key) * player.duration) / 10);
          break;

      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [player, mirrored, video, updateVideo, isEditingTitle, isEditingTags]);

  // ... (handleSave logic)

  // ... (return render with VideoPlaybackControls update)

  if (!video) return <div>Video not found</div>;

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this video?")) {
      await deleteVideo(video.id);
      navigate("/");
    }
  };



  return (
    <div className="practice-page">
      <div className="practice-header">
        <div>
          {isEditingTitle ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <input 
                value={editingTitle} 
                onChange={e => setEditingTitle(e.target.value)} 
                size={Math.max(video.title.length, 10)}
                style={{ 
                  fontSize: 'var(--font-size-title)', 
                  fontWeight: 'bold', 
                  fontFamily: 'inherit',
                  padding: 'var(--spacing-xs)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)'
                }}
              />
              <button className="btn btn-primary" onClick={() => {
                  updateVideo(video.id, { title: editingTitle });
                  setIsEditingTitle(false);
              }}>Save</button>
            </div>
          ) : (
            <h2 onClick={() => {
              setEditingTitle(video.title);
              setIsEditingTitle(true);
            }} style={{ cursor: 'pointer' }}>{video.title} ✏️</h2>
          )}
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-sm)', alignItems: 'center' }}>
            {isEditingTags ? (
              <>
                <TagsInput
                  value={video.labels}
                  onChange={(newTags) => updateVideo(video.id, { labels: newTags })}
                  onEnter={() => setIsEditingTags(false)}
                />
                <button className="btn btn-secondary" onClick={() => setIsEditingTags(false)}>Done</button>
              </>
            ) : (
              <>
                {video.labels.map(label => (
                  <span key={label} className="tag" style={{ padding: '2px var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>{label}</span>
                ))}
                <button className="btn btn-secondary" onClick={() => setIsEditingTags(true)}>Edit Tags</button>
              </>
            )}
          </div>
        </div>
        <div className="actions">
            <button className="btn btn-secondary" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? 'Hide Bookmarks' : 'Show Bookmarks'}
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete
            </button>
        </div>
      </div>

      <div className="practice-player-container">
        <video ref={videoRef} src={video.sourceUri} style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }} />
      </div>
      
      {isSidebarOpen && (
        <div className="bookmark-sidebar">
          <h3>Bookmarks</h3>
          {video.sections.sort((a, b) => a.start - b.start).map(section => (
            <div key={section.id} className="bookmark-item">
              <span>{section.start.toFixed(0)}s</span>
              {editingNotes[section.id] ? (
                <>
                  <textarea 
                    value={notes[section.id] ?? section.note ?? ""} 
                    onChange={e => {
                      setNotes(prev => ({...prev, [section.id]: e.target.value}));
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    placeholder="Add note..."
                    style={{ 
                      resize: 'none', 
                      overflow: 'hidden', 
                      minHeight: '1.5em',
                      fontFamily: 'inherit',
                      padding: 'var(--spacing-xs)'
                    }}
                  />
                  <button className="btn btn-secondary" onClick={() => {
                      const updatedSections = video.sections.map(s => s.id === section.id ? {...s, note: notes[section.id] ?? section.note} : s);
                      updateVideo(video.id, { sections: updatedSections });
                      setEditingNotes(prev => ({...prev, [section.id]: false}));
                  }}>Save</button>
                </>
              ) : (
                <>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{section.note || "No note"}</span>
                  <button className="btn btn-secondary" onClick={() => {
                    setNotes(prev => ({...prev, [section.id]: section.note ?? ""}));
                    setEditingNotes(prev => ({...prev, [section.id]: true}));
                  }}>Edit</button>
                </>
              )}
              <button className="btn btn-danger" onClick={() => {
                const updatedSections = video.sections.filter(s => s.id !== section.id);
                updateVideo(video.id, { sections: updatedSections });
              }}>Delete</button>
            </div>
          ))}
        </div>
      )}
      
      <VideoPlaybackControls
        player={player}
        video={video}
        mirrored={mirrored}
        onMirroredChange={(m) => { setMirrored(m); updateVideo(video.id, { mirrored: m }); }}

        showTapBpm={isEditingTitle}
        onBpmChange={(bpm) => updateVideo(video.id, { bpm })}
        onAddBookmark={(time) => {
           const newSection = { id: `${Date.now()}`, label: `Bookmark ${time.toFixed(1)}s`, start: time, end: time };
           const updatedSections = [...video.sections, newSection];
           updateVideo(video.id, { sections: updatedSections });
        }}
      />
    </div>
  );
}
