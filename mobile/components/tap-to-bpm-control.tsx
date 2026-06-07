import React, { useState, useCallback, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/lib/theme';

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
          {tapCount === 0 ? 'Tap to start 8-count' : `Tap: ${tapCount} / 8`}
        </Text>
      </Pressable>
    </View>
  );
}

