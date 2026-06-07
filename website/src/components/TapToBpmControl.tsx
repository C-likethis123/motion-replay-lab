import { useState, useCallback, useRef } from 'react';
import './TapToBpmControl.css';

type TapToBpmControlProps = {
  onBpmChange: (bpm: number) => void;
  initialBpm?: number;
};

export function TapToBpmControl({ onBpmChange, initialBpm = 120 }: TapToBpmControlProps) {
  const [tapCount, setTapCount] = useState(0);
  const startTime = useRef<number | null>(null);

  const handleTap = useCallback(() => {
    const now = Date.now();

    if (tapCount === 0) {
      startTime.current = now;
      setTapCount(1);
    } else {
      const newTapCount = tapCount + 1;
      setTapCount(newTapCount);

      if (newTapCount === 8) {
        const duration = now - (startTime.current || now);
        // Duration is for 7 intervals (8 taps)
        // BPM = 60000 / (interval)
        // interval = duration / 7
        const interval = duration / 7;
        const newBpm = Math.round(60000 / interval);
        
        onBpmChange(newBpm);
        setTapCount(0);
        startTime.current = null;
      }
    }
  }, [tapCount, onBpmChange]);

  return (
    <div className="tap-to-bpm-container">
      <button className="tap-button" onClick={handleTap}>
        {tapCount === 0 ? 'Tap to start 8-count' : `Tap: ${tapCount} / 8`}
      </button>
    </div>
  );
}
