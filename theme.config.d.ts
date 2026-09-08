type Swatch = { light: string; dark: string };

export const themeColors: {
  primary: Swatch;
  background: Swatch;
  surface: Swatch;
  elevated: Swatch;
  foreground: Swatch;
  muted: Swatch;
  border: Swatch;
  success: Swatch;
  warning: Swatch;
  error: Swatch;
};

declare const themeConfig: {
  themeColors: typeof themeColors;
};

export default themeConfig;
