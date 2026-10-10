import React from 'react';
import { View, Text } from 'react-native';
import WebView from './WebEmbed';
import { useTheme } from '../context/ThemeContext';
import { Glass, font } from './ui/kit';

export default function RealAR({ captionOffset = 12 }) {
  const { theme } = useTheme();
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
        <style>
          body { margin: 0; padding: 0; background: ${theme.background}; }
          model-viewer { width: 100%; height: 100vh; background-color: ${theme.background}; }
        </style>
      </head>
      <body>
        <model-viewer
          src="https://raw.githubusercontent.com/Tkumalo-dev/-CompuClass/thabo-and-kamo/ARfeature/assets/models/personal_computer.glb"
          alt="Personal Computer 3D Model"
          auto-rotate
          camera-controls
          shadow-intensity="1"
        ></model-viewer>
      </body>
    </html>
  `;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={{ flex: 1, backgroundColor: theme.background }}
      />
      <View pointerEvents="none" style={{ position: 'absolute', top: 12, left: captionOffset, right: 12 }}>
        <Glass strong radius={14} style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
          <Text style={[{ color: theme.text, fontSize: 16, textAlign: 'center' }, font(theme, 'semibold')]}>Personal Computer - 3D View</Text>
        </Glass>
      </View>
    </View>
  );
}
