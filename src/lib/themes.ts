export type ThemeName = 'classic' | 'sunset' | 'neon' | 'ocean' | 'mono' | 'blush' | 'custom';

export interface ThemeStyle {
  label: string;
  bg: string;
  text: string;
  accent: string;
  cardBody: string;
}

// Single source of truth for every theme's palette. IdCanvas, LanyardBadge,
// and the sidebar theme picker all read from this so they can't drift out
// of sync with each other.
export const THEME_STYLES: Record<ThemeName, ThemeStyle> = {
  classic: { label: 'Goa Green', bg: '#0B5B33', text: '#FFFFFF', accent: '#FF007A', cardBody: '#FFFDE8' },
  sunset: { label: 'Sun Yellow', bg: '#FFE600', text: '#0B5B33', accent: '#FF007A', cardBody: '#FFFFFF' },
  neon: { label: 'Neon Night', bg: '#0b0b0f', text: '#39ff14', accent: '#ff00ff', cardBody: '#070707' },
  ocean: { label: 'Ocean Blue', bg: '#0B3D91', text: '#FFFFFF', accent: '#00D9FF', cardBody: '#F0F8FF' },
  mono: { label: 'Minimal Mono', bg: '#1A1A1A', text: '#FFFFFF', accent: '#CCCCCC', cardBody: '#FFFFFF' },
  blush: { label: 'Pastel Blush', bg: '#FFD6E8', text: '#5C2A4D', accent: '#FF8FB1', cardBody: '#FFFFFF' },
  // Neutral, low-opinion starting point — meant to be fully recolored
  // element-by-element via the click-to-select picker rather than used as-is.
  custom: { label: 'Custom (Blank)', bg: '#E5E5E5', text: '#111111', accent: '#4F46E5', cardBody: '#FFFFFF' },
};

export const THEME_ORDER: ThemeName[] = ['classic', 'sunset', 'neon', 'ocean', 'mono', 'blush', 'custom'];
