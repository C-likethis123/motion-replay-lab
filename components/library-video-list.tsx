import { View } from "react-native";
import { Link } from "expo-router";
import { FileVideo, Plus } from "lucide-react-native";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { Pill } from "@/components/pill";
import { formatBpm } from "@/lib/bpm";
import { colors, spacing } from "@/lib/theme";
import type { DanceVideo } from "@/lib/videos";
import { pluralise } from "@/utils/i18n";

type LibraryVideoListProps = {
  videos: DanceVideo[];
  onAddVideo: () => void;
};

export function LibraryVideoList({
  videos,
  onAddVideo,
}: LibraryVideoListProps) {
  if (videos.length === 0) {
    return (
      <EmptyState
        icon={Plus}
        title="Add your first video"
        description="Build your practice library by choosing a dance video from this device."
        actionLabel="Add video"
        onAction={onAddVideo}
      />
    );
  }

  return (
    <View style={{ gap: spacing.xl }}>
      {videos.map((video) => (
        <Link key={video.id} href={`/video/${video.id}`} asChild>
          <Card>
            <Card.Image
              source={video.thumbnailUri}
              fallback={<FileVideo size={24} color={colors.accentText} />}
            />
            <Card.Content>
              <View style={{ gap: spacing.xs }}>
                <Card.Title>{video.title}</Card.Title>
                <Card.Description>
                  {video.style} - {video.teacher}
                </Card.Description>
              </View>
              <Card.Footer>
                <Pill label={formatBpm(video)} />
                <Pill label={`${pluralise(video.sections.length, "loop")}`} />
              </Card.Footer>
            </Card.Content>
          </Card>
        </Link>
      ))}
    </View>
  );
}
