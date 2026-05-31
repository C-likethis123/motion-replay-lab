import * as React from "react";
import type { VideoThumbnail } from "expo-video";
import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";

export type PracticeSection = {
  id: string;
  label: string;
  start: number;
  end: number;
};

export type BpmSource = "detected" | "tap" | "unavailable";
export type BpmDetectionStatus = "idle" | "detecting";
export type VideoThumbnailSource = string | VideoThumbnail | null;

export type DanceVideo = {
  id: string;
  title: string;
  style: string;
  teacher: string;
  sourceUri: string;
  thumbnailUri: VideoThumbnailSource;
  bpm: number | null;
  countSeconds: number | null;
  bpmSource: BpmSource;
  bpmConfidence?: number;
  bpmDetectionStatus?: BpmDetectionStatus;
  bpmDetectionError?: string;
  sections: PracticeSection[];
};

type VideoInput = Omit<DanceVideo, "id">;

type VideosContextValue = {
  videos: DanceVideo[];
  addVideo: (video: VideoInput) => string;
  updateVideo: (id: string, video: Partial<VideoInput>) => void;
  deleteVideo: (id: string) => void;
};

const VideosContext = createContext<VideosContextValue | null>(null);

export function VideosProvider({ children }: { children: ReactNode }) {
  const [videos, setVideos] = useState<DanceVideo[]>([]);

  const addVideo = useCallback((video: VideoInput) => {
    const id = `${Date.now()}`;

    setVideos((current) => [
      {
        ...video,
        id,
        sections: video.sections.length > 0 ? video.sections : [],
      },
      ...current,
    ]);

    return id;
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

  return (
    <VideosContext.Provider value={value}>{children}</VideosContext.Provider>
  );
}

export function useVideos() {
  const context = React.use(VideosContext);

  if (!context) {
    throw new Error("useVideos must be used inside VideosProvider");
  }

  return context;
}
