import React, { createContext, useContext } from 'react';

/**
 * Soft Glass light theme. Brand colours stay CompuClass.
 * Tab-bar and glass numbers that differ from the mockup CSS follow the
 * iOS 26 kit (selection pill, unselected label, small-glass fill, shadow).
 */
export const appTheme = {
  primary: '#0A66FF',
  primaryInk: '#0A55D6',
  secondary: '#DDF3F4',
  accent: '#3BB8C4',
  accentInk: '#0A6F79',
  background: '#F7FBFD',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#0B1B3A',
  textSecondary: '#44526F',
  textTertiary: '#5E6B85',
  border: '#DCE6EF',
  borderLight: '#EAF0F6',
  inputBorder: '#C9D6E3',
  tint: '#EDF4FF',
  success: '#1F9D55',
  successInk: '#17743F',
  successWash: '#E3F5EA',
  warning: '#E39B0B',
  warningInk: '#8A5A00',
  warningWash: '#FDF1D6',
  error: '#D92D4A',
  errorInk: '#B01E38',
  errorWash: '#FBE3E8',
  yellowTint: '#FFF3B0',
  yellow: '#FFE680',
  yellowInk: '#7A5C00',
  yellowWash: '#FFF9D6',
  // iOS 26 tab bar (brand blue stands in for Accents/Blue)
  tabSelected: '#0A66FF',
  tabUnselected: '#1A1A1A',
  tabPill: '#EDEDED',
  glassFill: 'rgba(255,255,255,0.65)',
  glassPanel: 'rgba(255,255,255,0.70)',
  glassSidebar: 'rgba(255,255,255,0.66)',
  glassTint: 'rgba(59,184,196,0.04)',
  glassBorder: 'rgba(255,255,255,0.80)',
  glassShadow: 'rgba(0,0,0,0.12)',
  iconTone: 'rgba(59,184,196,0.38)',
  iconToneYellow: 'rgba(255,200,40,0.60)',
  overlay: 'rgba(11,27,58,0.45)',
  // Kept so older screens that still read these keys pick up the one palette
  // instead of a second purple/orange theme.
  purple: '#0A6F79',
  orange: '#E39B0B',
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 24,
  radiusButton: 14,
  radiusSheet: 34,
  fontHead: 'PlusJakartaSans_800ExtraBold',
  fontHeadBold: 'PlusJakartaSans_700Bold',
  fontBody: 'Inter_400Regular',
  fontBodyMedium: 'Inter_500Medium',
  fontBodySemibold: 'Inter_600SemiBold',
  fontBodyBold: 'Inter_700Bold',
  // Older lecturer screens still paint headers and buttons from these keys.
  gradient: ['#F7FBFD', '#EDF4FF'],
  primaryGradient: ['#0A66FF', '#0A55D6'],
  info: '#0A66FF',
};

const ThemeContext = createContext({ theme: appTheme });

export const ThemeProvider = ({ children }) => (
  <ThemeContext.Provider value={{ theme: appTheme }}>
    {children}
  </ThemeContext.Provider>
);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
