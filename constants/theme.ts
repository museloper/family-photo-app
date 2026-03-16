import { Platform } from 'react-native';

const tintLight = '#FF6B8A';
const tintDark = '#FF8FA3';

export const Colors = {
  light: {
    text: '#1A1A2E',
    subtext: '#687076',
    background: '#F8F8F8',
    card: '#FFFFFF',
    tint: tintLight,
    icon: '#687076',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintLight,
    border: '#EFEFEF',
    primary: tintLight,
  },
  dark: {
    text: '#ECEDEE',
    subtext: '#9BA1A6',
    background: '#151718',
    card: '#1E2022',
    tint: tintDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintDark,
    border: '#2A2A2A',
    primary: tintDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
