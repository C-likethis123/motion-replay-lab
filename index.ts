import { EventTarget } from "event-target-shim";
import { CustomEvent as ReactNativeCustomEvent } from "react-native/Libraries/ReactPrivate/ReactNativePrivateInterface";
import { OfflineAudioContext } from "react-native-audio-api";

if (!globalThis.EventTarget) {
  globalThis.EventTarget = EventTarget as typeof globalThis.EventTarget;
}

if (!globalThis.CustomEvent) {
  globalThis.CustomEvent =
    ReactNativeCustomEvent as typeof globalThis.CustomEvent;
}

if (!globalThis.OfflineAudioContext) {
  globalThis.OfflineAudioContext =
    OfflineAudioContext as typeof globalThis.OfflineAudioContext;
}

import "expo-router/entry";
