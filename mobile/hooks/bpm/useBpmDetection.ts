import { EditVideoDraft } from "@/components/edit-video-modal";
import { BpmEstimate, deriveDetectedBpmTiming, estimateBpm } from "@/lib/bpm";
import { useState, useRef, useCallback } from "react";
import { UseFormSetValue } from "react-hook-form";

export function useBpmDetection(setValue: UseFormSetValue<EditVideoDraft>) {
  const [estimate, setEstimate] = useState<BpmEstimate | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const requestRef = useRef(0);

  const reset = useCallback(() => {
    requestRef.current += 1;
    setEstimate(null);
    setIsEstimating(false);
  }, []);

  const detectBpm = useCallback(
    async (sourceUri: string) => {
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      setEstimate(null);
      setIsEstimating(true);

      try {
        const nextEstimate = await estimateBpm(sourceUri);

        if (requestRef.current !== requestId) {
          return;
        }

        setEstimate(nextEstimate);
        if (nextEstimate.bpm) {
          const timing = deriveDetectedBpmTiming(nextEstimate);
          setValue("bpm", timing.bpm, { shouldDirty: true });
          setValue("countSeconds", timing.countSeconds, { shouldDirty: true });
          setValue("firstBeatTimestamp", timing.firstBeatTimestamp, {
            shouldDirty: true,
          });
          setValue("firstEightCountTimestamp", timing.firstEightCountTimestamp, {
            shouldDirty: true,
          });
          setValue("bpmSource", timing.bpmSource, { shouldDirty: true });
          setValue("bpmConfidence", timing.bpmConfidence, {
            shouldDirty: true,
          });
          setValue("bpmDetectionError", undefined, { shouldDirty: true });
        } else {
          setValue("bpmDetectionError", nextEstimate.error, {
            shouldDirty: true,
          });
        }
      } finally {
        if (requestRef.current === requestId) {
          setIsEstimating(false);
        }
      }
    },
    [setValue],
  );

  return { estimate, isEstimating, detectBpm, reset };
}
