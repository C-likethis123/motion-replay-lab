import { Bookmark } from 'lucide-react';
import type { PracticeSection } from '../lib/db';
import './TimelineMarkers.css';

interface TimelineMarkersProps {
  sections: PracticeSection[];
  duration: number;
  onSeek: (time: number) => void;
}

export function TimelineMarkers({ sections, duration, onSeek }: TimelineMarkersProps) {
  if (duration === 0) return null;

  return (
    <div className="timeline-markers-container">
      {sections.map((section) => {
        const progress = Math.min(Math.max(section.start / duration, 0), 1);
        const left = `${progress * 100}%`;
        return (
          <Bookmark
            key={section.id}
            className="timeline-marker"
            style={{ left }}
            onClick={(e) => {
              e.stopPropagation();
              onSeek(section.start);
            }}
            aria-label={section.label}
            size={12}
          />
        );
      })}
    </div>
  );
}
