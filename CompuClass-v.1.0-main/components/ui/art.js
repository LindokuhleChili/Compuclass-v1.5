import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

const BOARD = `<svg viewBox="0 0 400 400" width="100%" height="100%"><g transform="translate(60 40)"><rect width="280" height="260" rx="24" fill="#fff" stroke="#C9D6E3" stroke-width="2"/><g stroke="#3BB8C4" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 60h70l20 20M20 100h60M20 140h50l20-20M260 80h-60l-20 20M260 130h-50M260 180h-40l-20-20M60 240v-40h50M140 240v-30M220 240v-40"/></g><g fill="#3BB8C4"><circle cx="20" cy="60" r="5"/><circle cx="20" cy="100" r="5"/><circle cx="20" cy="140" r="5"/><circle cx="260" cy="80" r="5"/><circle cx="260" cy="130" r="5"/><circle cx="260" cy="180" r="5"/></g><rect x="100" y="70" width="80" height="80" rx="14" fill="#0A66FF"/><rect x="112" y="82" width="56" height="56" rx="8" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/><path d="M128 110h24M140 98v24" stroke="#fff" stroke-width="3" stroke-linecap="round"/><g fill="#0B1B3A"><rect x="196" y="30" width="10" height="38" rx="3"/><rect x="214" y="30" width="10" height="38" rx="3"/><rect x="232" y="30" width="10" height="38" rx="3"/></g><rect x="150" y="190" width="100" height="14" rx="5" fill="#E3EFFF" stroke="#0A66FF" stroke-width="2"/></g></svg>`;

const MAZE = `<svg viewBox="0 0 400 400" width="100%" height="100%"><g transform="translate(50 30)"><rect width="300" height="280" rx="24" fill="#fff" stroke="#C9D6E3" stroke-width="2"/><g stroke="#C9D6E3" stroke-width="3" fill="none" stroke-linecap="round"><path d="M40 40h120v50h60M40 40v90M100 90v100h80M220 40v110h-40M100 230h140M260 90v140"/></g><path d="M40 130h60v60h80v40h60" stroke="#0A66FF" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="40" cy="130" r="14" fill="#fff" stroke="#0A66FF" stroke-width="5"/><rect x="232" y="218" width="30" height="30" rx="8" fill="#3BB8C4"/></g></svg>`;

const PODIUM = `<svg viewBox="0 0 400 400" width="100%" height="100%"><g transform="translate(40 40)"><rect x="10" y="150" width="96" height="110" rx="16" fill="#fff" stroke="#C9D6E3" stroke-width="2"/><rect x="132" y="90" width="96" height="170" rx="16" fill="#0A66FF"/><rect x="254" y="190" width="96" height="70" rx="16" fill="#fff" stroke="#C9D6E3" stroke-width="2"/><g fill="#0B1B3A"><circle cx="58" cy="124" r="22" fill="#DDF3F4" stroke="#fff" stroke-width="3"/><circle cx="180" cy="62" r="26" fill="#FFE680" stroke="#fff" stroke-width="3"/><circle cx="302" cy="164" r="22" fill="#E4E9F2" stroke="#fff" stroke-width="3"/></g></g></svg>`;

const ARTS = [BOARD, MAZE, PODIUM];

export function StageArt({ index }) {
  return (
    <View style={{ flex: 1 }} pointerEvents="none">
      <SvgXml xml={ARTS[index] || BOARD} width="100%" height="100%" />
    </View>
  );
}

export function GameArt({ kind }) {
  const xml = kind === 'maze'
    ? `<svg viewBox="0 0 320 112" width="100%" height="100%"><rect width="320" height="112" fill="#E3EFFF"/><g stroke="#0B1B3A" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"><path d="M40 20h80v28h60v30M120 48v44h70M180 20h100v40M230 60v32h50"/></g><path d="M40 56h40v32h60v-28h50v28" stroke="#0A66FF" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="40" cy="56" r="8" fill="#fff" stroke="#0A66FF" stroke-width="3"/><rect x="232" y="80" width="16" height="16" rx="4" fill="#3BB8C4"/></svg>`
    : `<svg viewBox="0 0 320 112" width="100%" height="100%"><rect width="320" height="112" fill="#DDF3F4"/><rect x="0" y="88" width="320" height="24" fill="rgba(11,27,58,0.08)"/><path d="M0 88h320" stroke="#0B1B3A" stroke-width="2"/><rect x="190" y="64" width="18" height="24" rx="3" fill="#0A66FF"/><rect x="214" y="72" width="18" height="16" rx="3" fill="#0A66FF" opacity=".55"/><rect x="262" y="58" width="18" height="30" rx="3" fill="#0A66FF"/><g transform="translate(84 46)"><rect width="38" height="38" rx="10" fill="#fff" stroke="#0B1B3A" stroke-width="2"/><rect x="8" y="10" width="22" height="14" rx="4" fill="#3BB8C4" opacity=".5"/><circle cx="15" cy="17" r="2.2" fill="#0B1B3A"/><circle cx="25" cy="17" r="2.2" fill="#0B1B3A"/></g></svg>`;
  return <SvgXml xml={xml} width="100%" height="100%" />;
}
