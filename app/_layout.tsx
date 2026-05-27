import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { VideosProvider } from "@/lib/videos";

export default function RootLayout() {
  return (
    <VideosProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#f8f4ee" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "#f8f4ee" },
        }}
      />
    </VideosProvider>
  );
}
