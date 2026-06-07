import React from 'react';
import { Pressable, View } from 'react-native';
import type { PracticeSection } from '@/lib/videos';
import { colors, spacing } from '@/lib/theme';

interface TimelineMarkersProps {
  sections: PracticeSection[];
  duration: number;
  onSeek: (time: number) => void;
  sliderWidth: number;
}

export function TimelineMarkers({ sections, duration, onSeek, sliderWidth }: TimelineMarkersProps) {
  if (duration === 0) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', flexDirection: 'row', alignItems: 'center' }}>
      {sections.map((section) => {
        const left = (section.start / duration) * sliderWidth;
        return (
          <Pressable
            key={section.id}
            onPress={() => onSeek(section.start)}
            style={{
              position: 'absolute',
              left: left - 2, // 2 is half of width 4
              width: 4,
              height: '100%',
              backgroundColor: colors.accent,
            }}
          />
        );
      })}
    </View>
  );
}
