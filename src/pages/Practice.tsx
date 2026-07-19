import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useVideos } from "../lib/videos";
import { useWebVideoPlayer } from "../hooks/useWebVideoPlayer";
import { VideoPlaybackControls } from "../components/VideoPlaybackControls";
import { TagsInput } from "../components/TagsInput";

import "./Practice.css";

function isSpaceKey(e: KeyboardEvent) {
  return e.key === " " || e.key === "Spacebar" || e.code === "Space";
}

function isTextEntryTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;

  return target instanceof HTMLInputElement && target.type !== "range";
}

export default function Practice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { videos, updateVideo, deleteVideo } = useVideos();
  const video = videos.find((item) => item.id === id);

  const { setVideoNode, ...player } = useWebVideoPlayer();
  const [mirrored, setMirrored] = useState(video?.mirrored ?? false);
  const [lastVideoId, setLastVideoId] = useState<string | null>(null);

  if (video && video.id !== lastVideoId) {
    setLastVideoId(video.id);
    setMirrored(video.mirrored);
  }

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState(video?.title || "");
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingNotes, setEditingNotes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!player || !video || isEditingTitle || isEditingTags) return;
      if (isTextEntryTarget(e.target)) return;
      const countSeconds = video.countSeconds || 1;
      if (isSpaceKey(e)) {
        e.preventDefault();
        e.stopPropagation();
        if (player.isPlaying) {
          player.pause();
        } else {
          player.play();
        }
        return;
      }

      switch (e.key) {
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
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!player || !video || isEditingTitle || isEditingTags) return;
      if (isTextEntryTarget(e.target) || !isSpaceKey(e)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
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
      <div className={`practice-layout-grid ${isSidebarOpen ? 'with-sidebar' : 'no-sidebar'}`}>
        
        {/* Main Column: Player, Controls, and details */}
        <div className="practice-main-content">
          <div className="practice-title-bar">
            <div className="details-actions-row">
              <div className="practice-title-and-tags">
                <div className="practice-title-content">
                  {isEditingTitle ? (
                    <div className="title-edit-container">
                      <input 
                        value={editingTitle} 
                        onChange={e => setEditingTitle(e.target.value)} 
                        size={Math.max(video.title.length, 10)}
                        className="title-edit-input"
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => {
                          updateVideo(video.id, { title: editingTitle });
                          setIsEditingTitle(false);
                      }}>Save</button>
                    </div>
                  ) : (
                    <h2 className="video-details-title" onClick={() => {
                      setEditingTitle(video.title);
                      setIsEditingTitle(true);
                    }}>
                      {video.title} <span className="edit-icon">✏️</span>
                    </h2>
                  )}
                </div>

                <div className="tags-section">
                  {isEditingTags ? (
                    <div className="tags-edit-container">
                      <TagsInput
                        value={video.labels}
                        onChange={(newTags) => updateVideo(video.id, { labels: newTags })}
                      />
                      <button className="btn btn-secondary btn-sm" onClick={() => setIsEditingTags(false)}>Done</button>
                    </div>
                  ) : (
                    <div className="tags-list">
                      {video.labels.map(label => (
                        <span key={label} className="tag-pill">{label}</span>
                      ))}
                      <button className="btn btn-secondary btn-sm" onClick={() => setIsEditingTags(true)}>Edit Tags</button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="actions-section">
                <button className="btn btn-secondary" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                  {isSidebarOpen ? 'Hide Bookmarks' : 'Show Bookmarks'}
                </button>
                <button className="btn btn-danger" onClick={handleDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>

          <div className="practice-player-container">
            <video
              ref={setVideoNode}
              src={video.sourceUri}
              preload="auto"
              playsInline
              className="practice-video"
              style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }}
            />
          </div>
          
          <VideoPlaybackControls
            player={player}
            video={video}
            mirrored={mirrored}
            onMirroredChange={(m) => { setMirrored(m); updateVideo(video.id, { mirrored: m }); }}
            showTapBpm={isEditingTitle}
            onBpmChange={(bpm) => updateVideo(video.id, { bpm, countSeconds: 60 / bpm })}
            onAddBookmark={(time) => {
               const newSection = { id: `${Date.now()}`, label: `Bookmark ${time.toFixed(1)}s`, start: time, end: time };
               const updatedSections = [...video.sections, newSection];
               updateVideo(video.id, { sections: updatedSections });
            }}
          />

        </div>

        {/* Sidebar Column: Bookmarks (Responsive Grid-placement) */}
        {isSidebarOpen && (
          <div className="bookmark-sidebar">
            <div className="sidebar-header">
              <h3>Bookmarks ({video.sections.length})</h3>
            </div>
            <div className="bookmarks-scroll-container">
              {video.sections.length === 0 ? (
                <div className="empty-bookmarks">
                  No bookmarks yet. Click "Bookmark" during playback to save moments.
                </div>
              ) : (
                video.sections.sort((a, b) => a.start - b.start).map(section => (
                  <div key={section.id} className="bookmark-card">
                    <div className="bookmark-card-top">
                      <button 
                        className="bookmark-time-badge"
                        onClick={() => player.seekTo(section.start)}
                      >
                        ⏱️ {section.start.toFixed(1)}s
                      </button>
                      <span className="bookmark-note">{section.note || "No notes added"}</span>
                    </div>
                    {editingNotes[section.id] ? (
                      <div className="bookmark-edit-row">
                        <textarea 
                          value={notes[section.id] ?? section.note ?? ""} 
                          onChange={e => {
                            setNotes(prev => ({...prev, [section.id]: e.target.value}));
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          placeholder="Write a note about this move..."
                          className="bookmark-textarea"
                        />
                        <div className="bookmark-edit-actions">
                          <button className="btn btn-primary btn-sm" onClick={() => {
                              const updatedSections = video.sections.map(s => s.id === section.id ? {...s, note: notes[section.id] ?? section.note} : s);
                              updateVideo(video.id, { sections: updatedSections });
                              setEditingNotes(prev => ({...prev, [section.id]: false}));
                          }}>Save</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => {
                              setEditingNotes(prev => ({...prev, [section.id]: false}));
                          }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="bookmark-actions-row">
                        <button className="btn btn-secondary btn-sm" onClick={() => {
                          setNotes(prev => ({...prev, [section.id]: section.note ?? ""}));
                          setEditingNotes(prev => ({...prev, [section.id]: true}));
                        }}>Edit Note</button>
                        <button className="btn btn-danger btn-sm" onClick={() => {
                          const updatedSections = video.sections.filter(s => s.id !== section.id);
                          updateVideo(video.id, { sections: updatedSections });
                        }}>Remove</button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
