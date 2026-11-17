const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');
['glb', 'gltf', 'bin'].forEach((ext) => {
  if (!config.resolver.assetExts.includes(ext)) config.resolver.assetExts.push(ext);
});

module.exports = config;
