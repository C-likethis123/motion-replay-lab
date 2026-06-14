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
        const left = `${(section.start / duration) * 100}%`;
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
            fill="black"
          />
        );
      })}
    </div>
  );
}
