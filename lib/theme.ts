export const colors = {
  surface: "#ffffff",
  appBackground: "#f8f4ee",
  text: "#1f2a2e",
  textSecondary: "#6f665c",
  textMuted: "#756d63",
  textSubtle: "#8f867b",
  border: "#d8d1c7",
  borderStrong: "#ded7cc",
  primary: "#1f2a2e",
  primaryOn: "#ffffff",
  accent: "#52796f",
  accentSoft: "#edf1e7",
  accentSelected: "#e4eee8",
  accentBorder: "#91aa9d",
  accentText: "#405043",
  danger: "#b42318",
  dangerSoft: "#fff5f3",
  dangerBorder: "#f0c7c0",
  videoChrome: "#111719",
  videoChromeBorder: "#242d30",
  progressTrack: "#dfd8ce",
} as const;

export const radii = {
  xs: 4,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 14,
  xxxl: 16,
  screenGap: 18,
  screen: 20,
  screenBottom: 40,
  screenBottomTall: 42,
} as const;

export const typography = {
  size: {
    xxs: 12,
    xs: 13,
    sm: 14,
    md: 15,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 22,
    title: 24,
    display: 28,
  },
  weight: {
    semibold: "600",
    bold: "700",
  },
} as const;

export const opacity = {
  disabled: 0.38,
  pressed: 0.72,
  pressedSoft: 0.78,
  pressedCard: 0.82,
} as const;

export const shadows = {
  card: "0 1px 2px rgba(31, 42, 46, 0.06)",
} as const;
