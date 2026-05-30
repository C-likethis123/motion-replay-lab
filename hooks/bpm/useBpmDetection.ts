import { AddVideoDraft } from "@/components/add-video-modal";
import { BpmEstimate, estimateBpm } from "@/lib/bpm";
import { useState, useRef, useCallback } from "react";
import { UseFormSetValue } from "react-hook-form";

export function useBpmDetection(setValue: UseFormSetValue<AddVideoDraft>) {
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
          setValue("bpm", nextEstimate.bpm.toString(), { shouldDirty: true });
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
