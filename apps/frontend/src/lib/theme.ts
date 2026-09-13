export const THEMES = ['oled', 'midnight', 'graphite'] as const;
export type ThemeId = (typeof THEMES)[number];

export interface SceneTheme {
  background: string;
  fog: string;
  surround: string;
  indoorFloor: string;
  beachFloor: string;
}

export interface ThemeInfo {
  label: string;
  description: string;
  swatch: string;
  scene: SceneTheme;
}

export const THEME_INFO: Record<ThemeId, ThemeInfo> = {
  oled: {
    label: 'OLED Black',
    description: 'True black, maximum contrast — best on OLED screens',
    swatch: '#000000',
    scene: {
      background: '#000000',
      fog: '#000000',
      surround: '#000000',
      indoorFloor: '#0c0e12',
      beachFloor: '#6d5330',
    },
  },
  midnight: {
    label: 'Midnight',
    description: 'Deep navy with a warm court — the classic Tempo look',
    swatch: '#0b1120',
    scene: {
      background: '#0b1120',
      fog: '#0b1120',
      surround: '#0f2f4f',
      indoorFloor: '#c98b4b',
      beachFloor: '#e2bd85',
    },
  },
  graphite: {
    label: 'Graphite',
    description: 'Neutral charcoal for long editing sessions',
    swatch: '#121215',
    scene: {
      background: '#09090b',
      fog: '#09090b',
      surround: '#18181b',
      indoorFloor: '#16161a',
      beachFloor: '#5f4a2c',
    },
  },
};
