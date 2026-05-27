import * as React from "react";
import { createContext, ReactNode, useCallback, useMemo, useState } from "react";

export type PracticeSection = {
  id: string;
  label: string;
  start: number;
  end: number;
};

export type DanceVideo = {
  id: string;
  title: string;
  style: string;
  teacher: string;
  sourceUri: string;
  thumbnailUri: string;
  bpm: number;
  countSeconds: number;
  sections: PracticeSection[];
};

type VideoInput = Omit<DanceVideo, "id">;

type VideosContextValue = {
  videos: DanceVideo[];
  addVideo: (video: VideoInput) => void;
  updateVideo: (id: string, video: Partial<VideoInput>) => void;
  deleteVideo: (id: string) => void;
};

const VideosContext = createContext<VideosContextValue | null>(null);

const starterVideos: DanceVideo[] = [
  {
    id: "foundation-groove",
    title: "Foundation Groove",
    style: "Hip hop",
    teacher: "Studio A",
    sourceUri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnailUri:
      "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=900&q=80",
    bpm: 96,
    countSeconds: 0.625,
    sections: [
      { id: "warmup", label: "Warmup", start: 4, end: 18 },
      { id: "eight-a", label: "First 8", start: 18, end: 28 },
      { id: "eight-b", label: "Second 8", start: 28, end: 39 },
    ],
  },
  {
    id: "turn-combo",
    title: "Turn Combo",
    style: "Jazz",
    teacher: "Maya Chen",
    sourceUri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnailUri:
      "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=900&q=80",
    bpm: 112,
    countSeconds: 0.536,
    sections: [
      { id: "prep", label: "Prep", start: 6, end: 16 },
      { id: "turns", label: "Turns", start: 16, end: 31 },
    ],
  },
];

export function VideosProvider({ children }: { children: ReactNode }) {
  const [videos, setVideos] = useState(starterVideos);

  const addVideo = useCallback((video: VideoInput) => {
    setVideos((current) => [
      {
        ...video,
        id: `${Date.now()}`,
        sections: video.sections.length > 0 ? video.sections : [],
      },
      ...current,
    ]);
  }, []);

  const updateVideo = useCallback((id: string, video: Partial<VideoInput>) => {
    setVideos((current) =>
      current.map((item) => (item.id === id ? { ...item, ...video } : item)),
    );
  }, []);

  const deleteVideo = useCallback((id: string) => {
    setVideos((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(
    () => ({ videos, addVideo, updateVideo, deleteVideo }),
    [addVideo, deleteVideo, updateVideo, videos],
  );

  return <VideosContext.Provider value={value}>{children}</VideosContext.Provider>;
}

export function useVideos() {
  const context = React.use(VideosContext);

  if (!context) {
    throw new Error("useVideos must be used inside VideosProvider");
  }

  return context;
}
