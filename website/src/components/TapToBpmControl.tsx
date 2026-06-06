import { useState, useCallback, useEffect, useRef } from 'react';
import './TapToBpmControl.css';

type TapToBpmControlProps = {
  onBpmChange: (bpm: number) => void;
  initialBpm?: number;
};

export function TapToBpmControl({ onBpmChange, initialBpm = 120 }: TapToBpmControlProps) {
  const [bpm, setBpm] = useState(initialBpm);
  const [tapTimestamps, setTapTimestamps] = useState<number[]>([]);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContext.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!metronomeEnabled) return;

    const interval = (60000 / bpm);
    const intervalId = setInterval(() => {
      if (!audioContext.current) return;
      
      const osc = audioContext.current.createOscillator();
      const gain = audioContext.current.createGain();
      osc.connect(gain);
      gain.connect(audioContext.current.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.1, audioContext.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.current.currentTime + 0.05);
      osc.start();
      osc.stop(audioContext.current.currentTime + 0.05);
    }, interval);

    return () => clearInterval(intervalId);
  }, [metronomeEnabled, bpm]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    let newTimestamps = [...tapTimestamps, now];

    if (newTimestamps.length > 1 && (now - newTimestamps[newTimestamps.length - 2] > 2000)) {
        newTimestamps = [now];
    }
    
    newTimestamps = newTimestamps.slice(-8);
    setTapTimestamps(newTimestamps);
    
    if (newTimestamps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTimestamps.length; i++) {
        intervals.push(newTimestamps[i] - newTimestamps[i - 1]);
      }
      intervals.sort((a, b) => a - b);
      const medianInterval = intervals[Math.floor(intervals.length / 2)];
      const newBpm = Math.round(60000 / medianInterval);
      setBpm(newBpm);
      onBpmChange(newBpm);
    }
  }, [tapTimestamps, onBpmChange]);

  return (
    <div className="tap-to-bpm-container">
      <button className="tap-button" onClick={handleTap}>
        Tap to adjust: {bpm} BPM
      </button>
      <input 
        type="range"
        min="40"
        max="220"
        value={bpm}
        onChange={(e) => { const val = parseInt(e.target.value); setBpm(val); onBpmChange(val); }}
      />
      <button onClick={() => setMetronomeEnabled(!metronomeEnabled)}>
        {metronomeEnabled ? 'Stop Metronome' : 'Start Metronome'}
      </button>
    </div>
  );
}
