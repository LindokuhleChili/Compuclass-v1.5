import React from 'react';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';

// Two-tone line icons. Tone path is a soft fill; line paths are a 2px round stroke.
const ICONS = {
  home: ['<path class="tn" d="M5 10.5 12 4l7 6.5V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/>', '<path d="M5 10.5 12 4l7 6.5V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M9.5 20v-5.5h5V20"/>'],
  book: ['<path class="tn" d="M4.5 4.5c3.5 0 6 .5 7.5 2v14c-1.5-1.5-4-2-7.5-2z"/>', '<path d="M12 6.5C10.5 5 8 4.5 4.5 4.5v14c3.5 0 6 .5 7.5 2 1.5-1.5 4-2 7.5-2v-14c-3.5 0-6 .5-7.5 2zM12 6.5v14"/>'],
  quiz: ['<rect class="tn" x="5" y="4" width="14" height="17" rx="3"/>', '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 4V3h6v1M9 13l2 2 4-4.5"/>'],
  trophy: ['<path class="tn" d="M7 4h10v5a5 5 0 0 1-10 0z"/>', '<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5A3.5 3.5 0 0 1 16.5 11M12 14v4M8.5 20h7"/>'],
  user: ['<circle class="tn" cx="12" cy="8" r="4"/>', '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.5-4 3.5-6 7.5-6s7 2 7.5 6"/>'],
  sliders: ['<circle class="tn" cx="15" cy="7" r="2.8"/><circle class="tn" cx="9" cy="17" r="2.8"/>', '<path d="M4 7h8M18 7h2M4 17h2M12 17h8"/><circle cx="15" cy="7" r="2.8"/><circle cx="9" cy="17" r="2.8"/>'],
  monitor: ['<rect class="tn" x="3" y="4" width="18" height="12" rx="2.5"/>', '<rect x="3" y="4" width="18" height="12" rx="2.5"/><path d="M8 20h8M12 16v4"/>'],
  cpu: ['<rect class="tn" x="9" y="9" width="6" height="6" rx="1"/>', '<rect x="5" y="5" width="14" height="14" rx="3"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>'],
  windows: ['<rect class="tn" x="4" y="4" width="7" height="7" rx="1.5"/><rect class="tn" x="13" y="13" width="7" height="7" rx="1.5"/>', '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'],
  wrench: ['<path class="tn" d="M15 5a4 4 0 0 0-4.2 5.4L4.7 16.5a2 2 0 0 0 2.8 2.8l6.1-6.1A4 4 0 0 0 19 9l-2.5 2.5-2.5-.5-.5-2.5z"/>', '<path d="M15 5a4 4 0 0 0-4.2 5.4L4.7 16.5a2 2 0 0 0 2.8 2.8l6.1-6.1A4 4 0 0 0 19 9l-2.5 2.5-2.5-.5-.5-2.5z"/>'],
  bot: ['<rect class="tn" x="4" y="8" width="16" height="11" rx="4"/>', '<rect x="4" y="8" width="16" height="11" rx="4"/><path d="M12 8V5.5M9 13v1M15 13v1M2 13v2M22 13v2"/><circle cx="12" cy="4.5" r="1"/>'],
  gamepad: ['<rect class="tn" x="2" y="7" width="20" height="11" rx="5.5"/>', '<rect x="2" y="7" width="20" height="11" rx="5.5"/><path d="M7 10.5v4M5 12.5h4M16 11.5h.01M18 13.5h.01"/>'],
  maze: ['<rect class="tn" x="4" y="4" width="16" height="16" rx="3"/>', '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 4v8h6v8"/>'],
  bell: ['<path class="tn" d="M6 17v-6a6 6 0 0 1 12 0v6z"/>', '<path d="M6 17v-6a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21.5h4"/>'],
  flame: ['<path class="tn" d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .5 1.5 1 2 2 2 0-3-.5-5 1-8z"/>', '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .5 1.5 1 2 2 2 0-3-.5-5 1-8z"/>'],
  bulb: ['<path class="tn" d="M12 3a6.5 6.5 0 0 0-3.5 12c.7.6 1 1.3 1 2h5c0-.7.3-1.4 1-2A6.5 6.5 0 0 0 12 3z"/>', '<path d="M9.5 20h5M12 3a6.5 6.5 0 0 0-3.5 12c.7.6 1 1.3 1 2h5c0-.7.3-1.4 1-2A6.5 6.5 0 0 0 12 3z"/>'],
  clock: ['<circle class="tn" cx="12" cy="12" r="9"/>', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
  check: ['', '<path d="M5 12.5l4.5 4.5L19 7.5"/>'],
  chev: ['', '<path d="M9 6l6 6-6 6"/>'],
  chevLeft: ['', '<path d="M15 6l-6 6 6 6"/>'],
  arrow: ['', '<path d="M5 12h14M13 6l6 6-6 6"/>'],
  search: ['<circle class="tn" cx="11" cy="11" r="6.5"/>', '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'],
  mail: ['<rect class="tn" x="3" y="5" width="18" height="14" rx="3"/>', '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7.5l8 6 8-6"/>'],
  lock: ['<rect class="tn" x="5" y="10" width="14" height="10" rx="3"/>', '<rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8 10V8a4 4 0 0 1 8 0v2"/>'],
  eye: ['<circle class="tn" cx="12" cy="12" r="3"/>', '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'],
  eyeOff: ['', '<path d="M3 3l18 18M10.5 10.7A3 3 0 0 0 14 14.2M6.2 6.5C4 8 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1M9.8 5.8A10 10 0 0 1 12 5.5C18 5.5 21.5 12 21.5 12a18 18 0 0 1-2.2 3.1"/>'],
  logout: ['', '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l-4 4 4 4M6 12h10"/>'],
  play: ['<path class="tn" d="M8 5.5v13l11-6.5z"/>', '<path d="M8 5.5v13l11-6.5z"/>'],
  medal: ['<circle class="tn" cx="12" cy="9" r="5"/>', '<circle cx="12" cy="9" r="5"/><path d="M9 13.5 7.5 21 12 18.5 16.5 21 15 13.5"/>'],
  shield: ['<path class="tn" d="M12 3l7.5 3v5.5c0 4.5-3 8-7.5 9.5-4.5-1.5-7.5-5-7.5-9.5V6z"/>', '<path d="M12 3l7.5 3v5.5c0 4.5-3 8-7.5 9.5-4.5-1.5-7.5-5-7.5-9.5V6z"/><path d="M9 12l2.2 2.2L15 10.5"/>'],
  wifi: ['<circle class="tn" cx="12" cy="19" r="2"/>', '<path d="M3 9.5a13 13 0 0 1 18 0M6 13a8.5 8.5 0 0 1 12 0M9.2 16.3a4 4 0 0 1 5.6 0"/><circle cx="12" cy="19.5" r="1"/>'],
  keyboard: ['<rect class="tn" x="2" y="6" width="20" height="12" rx="3"/>', '<rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'],
  folder: ['<path class="tn" d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'],
  target: ['<circle class="tn" cx="12" cy="12" r="5"/>', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r=".5"/>'],
  type: ['', '<path d="M5 7V5h14v2M12 5v14M9 19h6"/>'],
  sun: ['<circle class="tn" cx="12" cy="12" r="4"/>', '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'],
  help: ['<circle class="tn" cx="12" cy="12" r="9"/>', '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>'],
  download: ['<path class="tn" d="M12 4v10"/>', '<path d="M12 3v11M8 10l4 4 4-4M5 19h14"/>'],
  refresh: ['', '<path d="M20 12a8 8 0 1 1-2.2-5.5M20 4v5h-5"/>'],
  close: ['', '<path d="M6 6l12 12M18 6 6 18"/>'],
  plus: ['', '<path d="M12 5v14M5 12h14"/>'],
  info: ['<circle class="tn" cx="12" cy="12" r="9"/>', '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 8h.01"/>'],
  school: ['<path class="tn" d="M3 10 12 5l9 5-9 5z"/>', '<path d="M3 10 12 5l9 5-9 5zM7 12v5c2 2 8 2 10 0v-5"/>'],
};

export function Icon({ name = 'help', size = 24, color, tone, style }) {
  const { theme } = useTheme();
  const spec = ICONS[name] || ICONS.help;
  const stroke = color || theme.text;
  const fill = tone || theme.iconTone;
  const toneSvg = (spec[0] || '').replace(/class="tn"/g, `fill="${fill}" stroke="none"`);
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${toneSvg}${spec[1] || ''}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} style={style} />;
}

export const ICON_NAMES = Object.keys(ICONS);
