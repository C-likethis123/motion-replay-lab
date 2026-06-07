import * as React from "react";
import type { VideoThumbnail } from "expo-video";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

export type PracticeSection = {
  id: string;
  label: string;
  start: number;
  end?: number;
};

export type BpmSource = "detected" | "tap" | "unavailable";
export type BpmDetectionStatus = "idle" | "detecting";
export type VideoThumbnailSource = string | VideoThumbnail | null;

export type DanceVideo = {
  id: string;
  title: string;
  sourceUri: string;
  thumbnailUri: VideoThumbnailSource;
  bpm: number | null;
  countSeconds: number | null;
  firstBeatTimestamp: number | null;
  firstEightCountTimestamp: number | null;
  bpmSource: BpmSource;
  bpmConfidence?: number;
  bpmDetectionStatus?: BpmDetectionStatus;
  bpmDetectionError?: string;
  sections: PracticeSection[];
  labels: string[];
  duration?: number;
};

type VideoInput = Omit<DanceVideo, "id">;

type VideosContextValue = {
  videos: DanceVideo[];
  addVideo: (video: VideoInput) => string;
  updateVideo: (id: string, video: Partial<VideoInput>) => void;
  deleteVideo: (id: string) => void;
  isLoaded: boolean;
};

const VideosContext = createContext<VideosContextValue | null>(null);

const STORAGE_KEY = "videos";

export function VideosProvider({ children }: { children: ReactNode }) {
  const [videos, setVideos] = useState<DanceVideo[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadVideos() {
      try {
        const savedVideos = await AsyncStorage.getItem(STORAGE_KEY);
        console.log("Loaded videos from storage:", savedVideos);
        if (savedVideos) {
          setVideos(JSON.parse(savedVideos));
        }
      } catch (error) {
        console.error("Failed to load videos", error);
      } finally {
        setIsLoaded(true);
      }
    }
    loadVideos();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(videos)).catch(
        console.error,
      );
    }
  }, [videos, isLoaded]);

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
    console.log("Updating video:", id, "with:", video);
    setVideos((current) =>
      current.map((item) => {
        const updated = (item.id === id ? { ...item, ...video } : item);
        console.log("New video state for", id, ":", updated);
        return updated;
      }),
    );
  }, []);

  const deleteVideo = useCallback((id: string) => {
    setVideos((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(
    () => ({ videos, addVideo, updateVideo, deleteVideo, isLoaded }),
    [addVideo, deleteVideo, updateVideo, videos, isLoaded],
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
