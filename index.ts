import { EventTarget } from "event-target-shim";
import { CustomEvent as ReactNativeCustomEvent } from "react-native/Libraries/ReactPrivate/ReactNativePrivateInterface";

if (!globalThis.EventTarget) {
  globalThis.EventTarget = EventTarget as typeof globalThis.EventTarget;
}

if (!globalThis.CustomEvent) {
  globalThis.CustomEvent =
    ReactNativeCustomEvent as typeof globalThis.CustomEvent;
}

if (!globalThis.document) {
  globalThis.document = {
    currentScript: null,
    title: "",
  } as typeof globalThis.document;
}

import "expo-router/entry";
