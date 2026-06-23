/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { db, type VideoMetadata, type PracticeSection, type BpmSource, type BpmDetectionStatus, type VideoThumbnailSource } from "./db";
import { estimateBpm, deriveDetectedBpmTiming } from "./bpm";

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
  teacher?: string;
  mirrored: boolean;
};

type VideoInput = Omit<DanceVideo, "id" | "sourceUri">;

type VideosContextValue = {
  videos: DanceVideo[];
  addVideo: (video: VideoInput, file: Blob | File) => Promise<string>;
  updateVideo: (id: string, video: Partial<VideoInput>) => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;
  isLoaded: boolean;
};

const VideosContext = createContext<VideosContextValue | null>(null);

export function VideosProvider({ children }: { children: ReactNode }) {
  const [videos, setVideos] = useState<DanceVideo[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const objectUrlsRef = useRef<Record<string, string>>({});
  const activeDetectionsRef = useRef<Set<string>>(new Set());

  // Clean up object URLs on unmount
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      Object.values(urls).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          console.error("Failed to revoke URL on unmount:", e);
        }
      });
    };
  }, []);

  const updateVideo = useCallback(async (id: string, updates: Partial<VideoInput>) => {
    console.log("Updating video:", id, "with:", updates);
    await db.videos.update(id, updates);
    const updatedMeta = await db.videos.get(id);
    console.log("Meta after update:", updatedMeta);

    setVideos((current) =>
      current.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  }, []);

  const runDetection = useCallback(async (id: string, file: Blob | File) => {
    if (activeDetectionsRef.current.has(id)) return;
    activeDetectionsRef.current.add(id);

    try {
      const bpmEstimate = await estimateBpm(file);
      await updateVideo(id, {
        ...deriveDetectedBpmTiming(bpmEstimate),
        bpmDetectionStatus: "idle",
        bpmDetectionError: bpmEstimate.error,
      });
    } catch (error) {
      console.error("BPM detection failed for:", id, error);
      await updateVideo(id, {
        bpmDetectionStatus: "idle",
        bpmDetectionError: error instanceof Error ? error.message : String(error),
      });
    } finally {
      activeDetectionsRef.current.delete(id);
    }
  }, [updateVideo]);

  const addVideo = useCallback(async (video: VideoInput, file: Blob | File) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const url = URL.createObjectURL(file);
    objectUrlsRef.current[id] = url;

    const metadata: VideoMetadata = {
      ...video,
      id,
      sections: video.sections.length > 0 ? video.sections : [],
      bpmDetectionStatus: "detecting",
    };

    await db.transaction("rw", [db.videos, db.videoBlobs], async () => {
      await db.videos.add(metadata);
      await db.videoBlobs.add({ id, blob: file });
    });

    setVideos((current) => [
      {
        ...metadata,
        sourceUri: url,
      },
      ...current,
    ]);

    runDetection(id, file);

    return id;
  }, [runDetection]);

  // Load videos from DB on mount
  useEffect(() => {
    async function loadVideos() {
      try {
        const metadataList = await db.videos.toArray();
        const loadedVideos: DanceVideo[] = [];

        for (const meta of metadataList) {
          console.log("Loaded meta:", meta);
          const blobRecord = await db.videoBlobs.get(meta.id);
          if (blobRecord) {
            const url = URL.createObjectURL(blobRecord.blob);
            objectUrlsRef.current[meta.id] = url;
            loadedVideos.push({
              ...meta,
              sourceUri: url,
            });
            if (meta.bpmDetectionStatus === "detecting") {
              runDetection(meta.id, blobRecord.blob);
            }
          } else {
            loadedVideos.push({
              ...meta,
              sourceUri: "",
            });
          }
        }

        // Sort videos newest first
        loadedVideos.sort((a, b) => b.id.localeCompare(a.id));
        setVideos(loadedVideos);
      } catch (error) {
        console.error("Failed to load videos from IndexedDB:", error);
      } finally {
        setIsLoaded(true);
      }
    }
    loadVideos();
  }, [runDetection]);

  const deleteVideo = useCallback(async (id: string) => {
    const url = objectUrlsRef.current[id];
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("Failed to revoke URL for delete:", e);
      }
      delete objectUrlsRef.current[id];
    }

    await db.transaction("rw", [db.videos, db.videoBlobs], async () => {
      await db.videos.delete(id);
      await db.videoBlobs.delete(id);
    });

    setVideos((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(
    () => ({ videos, addVideo, updateVideo, deleteVideo, isLoaded }),
    [addVideo, deleteVideo, updateVideo, videos, isLoaded]
  );

  return (
    <VideosContext.Provider value={value}>
      {children}
    </VideosContext.Provider>
  );
}

export function useVideos() {
  const context = React.use(VideosContext);

  if (!context) {
    throw new Error("useVideos must be used inside VideosProvider");
  }

  return context;
}
