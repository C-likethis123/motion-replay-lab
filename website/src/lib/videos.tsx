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
import { cleanupAbandonedTransfers, dataUrlToBlob, getOrCreateDevice, sha256Blob } from "./sync/storage";

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
  const thumbnailUrlsRef = useRef<Record<string, string>>({});
  const detectionQueue = useRef<string[]>([]);
  const processingDetection = useRef(false);

  // Clean up object URLs on unmount
  useEffect(() => {
    const urls = objectUrlsRef.current;
    const thumbnailUrls = thumbnailUrlsRef.current;
    return () => {
      Object.values(urls).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          console.error("Failed to revoke URL on unmount:", e);
        }
      });
      Object.values(thumbnailUrls).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          console.error("Failed to revoke thumbnail URL on unmount:", e);
        }
      });
    };
  }, []);

  const updateVideo = useCallback(async (id: string, updates: Partial<VideoInput>) => {
    console.log("Updating video:", id, "with:", updates);
    const existing = await db.videos.get(id);
    const device = await getOrCreateDevice();
    await db.videos.update(id, {
      ...updates,
      revision: {
        counter: (existing?.revision.counter ?? 0) + 1,
        deviceId: device.deviceId,
      },
      updatedAt: Date.now(),
    });
    const updatedMeta = await db.videos.get(id);
    console.log("Meta after update:", updatedMeta);

    setVideos((current) =>
      current.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  }, []);

  const processNextDetection = async () => {
    if (processingDetection.current || detectionQueue.current.length === 0) return;
    processingDetection.current = true;

    const id = detectionQueue.current[0];
    try {
      const blobRecord = await db.videoBlobs.get(id);
      if (blobRecord) {
        const bpmEstimate = await estimateBpm(blobRecord.blob);
        await updateVideo(id, {
          ...deriveDetectedBpmTiming(bpmEstimate),
          bpmDetectionStatus: "idle",
          bpmDetectionError: bpmEstimate.error,
        });
      }
    } catch (error) {
      console.error("BPM detection failed for:", id, error);
      await updateVideo(id, {
        bpmDetectionStatus: "idle",
        bpmDetectionError: error instanceof Error ? error.message : String(error),
      });
    } finally {
      detectionQueue.current.shift();
      processingDetection.current = false;
      // Pause slightly between detections to let browser breathe
      setTimeout(() => {
        processNextDetection();
      }, 1000);
    }
  };

  const queueDetection = useCallback((id: string) => {
    if (detectionQueue.current.includes(id)) return;
    detectionQueue.current.push(id);
    // Delay the start so it doesn't block the initial page load/render
    setTimeout(() => {
      processNextDetection();
    }, 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addVideo = useCallback(async (video: VideoInput, file: Blob | File) => {
    const id = crypto.randomUUID();
    const device = await getOrCreateDevice();
    const mediaHash = await sha256Blob(file);
    const thumbnailBlob = video.thumbnailUri ? await dataUrlToBlob(video.thumbnailUri) : null;
    const thumbnailHash = thumbnailBlob ? await sha256Blob(thumbnailBlob) : null;
    const url = URL.createObjectURL(file);
    objectUrlsRef.current[id] = url;
    let thumbnailUri: string | null = null;

    if (thumbnailBlob) {
      thumbnailUri = URL.createObjectURL(thumbnailBlob);
      thumbnailUrlsRef.current[id] = thumbnailUri;
    }

    const metadata: VideoMetadata = {
      ...video,
      id,
      thumbnailUri,
      sections: video.sections.length > 0 ? video.sections : [],
      bpmDetectionStatus: "detecting",
      media: {
        fileName: file instanceof File ? file.name : video.title,
        mimeType: file.type || "application/octet-stream",
        byteLength: file.size,
        sha256: mediaHash,
      },
      thumbnail: thumbnailBlob ? {
        mimeType: thumbnailBlob.type || "image/jpeg",
        byteLength: thumbnailBlob.size,
        sha256: thumbnailHash,
      } : undefined,
      revision: {
        counter: 1,
        deviceId: device.deviceId,
      },
      updatedAt: Date.now(),
    };

    await db.transaction("rw", [db.videos, db.videoBlobs, db.thumbnailBlobs], async () => {
      await db.videos.add(metadata);
      await db.videoBlobs.add({ id, blob: file });
      if (thumbnailBlob) {
        await db.thumbnailBlobs.add({ id, blob: thumbnailBlob });
      }
    });

    setVideos((current) => [
      {
        ...metadata,
        sourceUri: url,
      },
      ...current,
    ]);

    queueDetection(id);

    return id;
  }, [queueDetection]);

  // Load videos from DB on mount
  useEffect(() => {
    async function loadVideos() {
      try {
        await getOrCreateDevice();
        await cleanupAbandonedTransfers();
        const metadataList = await db.videos.toArray();
        const loadedVideos: DanceVideo[] = [];

        for (const meta of metadataList) {
          if (meta.deletedAt) {
            continue;
          }
          console.log("Loaded meta:", meta);
          const blobRecord = await db.videoBlobs.get(meta.id);
          const thumbnailRecord = await db.thumbnailBlobs.get(meta.id);
          const thumbnailUri = thumbnailRecord
            ? URL.createObjectURL(thumbnailRecord.blob)
            : meta.thumbnailUri;
          if (thumbnailRecord && thumbnailUri) {
            thumbnailUrlsRef.current[meta.id] = thumbnailUri;
          }
          if (blobRecord) {
            const url = URL.createObjectURL(blobRecord.blob);
            objectUrlsRef.current[meta.id] = url;
            loadedVideos.push({
              ...meta,
              thumbnailUri,
              sourceUri: url,
            });
            if (meta.bpmDetectionStatus === "detecting") {
              queueDetection(meta.id);
            }
          } else {
            loadedVideos.push({
              ...meta,
              thumbnailUri,
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
  }, [queueDetection]);

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
    const thumbnailUrl = thumbnailUrlsRef.current[id];
    if (thumbnailUrl) {
      try {
        URL.revokeObjectURL(thumbnailUrl);
      } catch (e) {
        console.error("Failed to revoke thumbnail URL for delete:", e);
      }
      delete thumbnailUrlsRef.current[id];
    }

    const existing = await db.videos.get(id);
    const device = await getOrCreateDevice();
    await db.transaction("rw", [db.videos, db.videoBlobs, db.thumbnailBlobs], async () => {
      await db.videos.update(id, {
        deletedAt: Date.now(),
        revision: {
          counter: (existing?.revision.counter ?? 0) + 1,
          deviceId: device.deviceId,
        },
        updatedAt: Date.now(),
      });
      await db.videoBlobs.delete(id);
      await db.thumbnailBlobs.delete(id);
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
