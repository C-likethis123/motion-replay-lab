import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { VideosProvider } from "@/lib/videos";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <VideosProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.appBackground },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.appBackground },
          }}
        />
      </VideosProvider>
    </SafeAreaProvider>
  );
}
