# Ticket: Use Safe Insets

Goal:
- Ensure the app UI respects device safe area insets (notches, home indicators, etc.) to prevent content overlap.

Scope:
- Apply `react-native-safe-area-context` throughout the app.
- Update top-level layouts and screen containers to use `SafeAreaView` or `useSafeAreaInsets` hooks.
- Ensure that the video player and control overlays correctly adjust their positions based on safe area insets.

Definition of done:
- All screens correctly respect device notches and home indicators.
- No UI components or controls are obscured or cut off on devices with non-standard screen shapes.
- Navigation headers and bottom controls are correctly positioned.

Steps to verify:
1. Test on a device with a notch (e.g., iPhone 13/14/15/16).
2. Test on a device with a bottom home indicator.
3. Ensure no content is obscured in portrait and landscape orientations.
4. Verify that touch targets near edges remain accessible.
