import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors, radii, spacing, typography } from '@/lib/theme';

type NativeAudioContext = Awaited<
  ReturnType<typeof createNativeAudioContext>
>;

type TapToBpmControlProps = {
  onBpmChange: (bpm: number) => void;
  initialBpm?: number;
};

export function TapToBpmControl({ onBpmChange, initialBpm = 120 }: TapToBpmControlProps) {
  const [bpm, setBpm] = useState(initialBpm);
  const [tapTimestamps, setTapTimestamps] = useState<number[]>([]);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const audioContext = useRef<NativeAudioContext | null>(null);

  useEffect(() => {
    let isMounted = true;

    createNativeAudioContext()
      .then((context) => {
        if (isMounted) {
          audioContext.current = context;
        } else {
          context.close().catch(() => {});
        }
      })
      .catch((error) => {
        console.error('Failed to initialize metronome audio', error);
      });

    return () => {
      isMounted = false;
      audioContext.current?.close().catch(() => {});
    };
  }, []);

  // Metronome logic
  useEffect(() => {
    if (!metronomeEnabled) return;

    const interval = (60000 / bpm);
    const intervalId = setInterval(async () => {
      if (!audioContext.current) return;
      
      try {
        // Generate a simple click sound (sine wave)
        const sampleRate = 22050;
        const duration = 0.05; // 50ms
        const buffer = audioContext.current.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.sin(2 * Math.PI * 880 * (i / sampleRate));
        }

        const source = audioContext.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.current.destination);
        source.start(0);
      } catch (e) {
        console.error('Failed to play metronome click', e);
      }
    }, interval);

    return () => clearInterval(intervalId);
  }, [metronomeEnabled, bpm]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    let newTimestamps = [...tapTimestamps, now];

    // Adaptive Reset: if interval > 2s, reset
    if (newTimestamps.length > 1 && (now - newTimestamps[newTimestamps.length - 2] > 2000)) {
        newTimestamps = [now];
    }
    
    // Keep last 8 taps
    newTimestamps = newTimestamps.slice(-8);
    setTapTimestamps(newTimestamps);
    
    if (newTimestamps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTimestamps.length; i++) {
        intervals.push(newTimestamps[i] - newTimestamps[i - 1]);
      }
      // Use median interval
      intervals.sort((a, b) => a - b);
      const medianInterval = intervals[Math.floor(intervals.length / 2)];
      const newBpm = Math.round(60000 / medianInterval);
      setBpm(newBpm);
      onBpmChange(newBpm);
    }
  }, [tapTimestamps, onBpmChange]);

  return (
    <View style={{ gap: spacing.md }}>
      <Pressable
        onPress={handleTap}
        style={{
          padding: spacing.md,
          borderRadius: radii.md,
          backgroundColor: colors.primary,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: colors.primaryOn, fontWeight: typography.weight.bold }}>
          {`Tap to adjust: ${bpm} BPM`}
        </Text>
      </Pressable>
      
      <Slider
        minimumValue={40}
        maximumValue={220}
        step={1}
        value={bpm}
        onValueChange={(val) => { setBpm(val); onBpmChange(val); }}
      />
      
      <Pressable 
        onPress={() => setMetronomeEnabled(!metronomeEnabled)}
        style={{ padding: spacing.sm, backgroundColor: colors.surface, alignItems: 'center' }}
      >
        <Text>{metronomeEnabled ? 'Stop Metronome' : 'Start Metronome'}</Text>
      </Pressable>
    </View>
  );
}

async function createNativeAudioContext() {
  const { AudioContext } = await import('react-native-audio-api');
  return new AudioContext();
}
