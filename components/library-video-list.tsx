import { View } from "react-native";
import { Link } from "expo-router";
import { FileVideo } from "lucide-react-native";
import { Card } from "@/components/card";
import { Pill } from "@/components/pill";
import { formatBpm } from "@/lib/bpm";
import { colors, spacing } from "@/lib/theme";
import type { DanceVideo } from "@/lib/videos";
import { pluralise } from "@/utils/i18n";

export function LibraryVideoList({ videos }: { videos: DanceVideo[] }) {
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
