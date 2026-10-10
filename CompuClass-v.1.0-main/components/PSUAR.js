import React from 'react';
import { StyleSheet } from 'react-native';
import WebView from './WebEmbed';
import { ARLoading, ARStage } from './ARChrome';

export default function PSUAR() {
  const sketchfabEmbedUrl = 'https://sketchfab.com/models/02db33d66a784c82a6202a3ec6850498/embed?autostart=1&ui_controls=1&ui_infos=0&ui_inspector=0&ui_stop=0&ui_watermark=0';

  return (
    <ARStage>
      <WebView
        source={{ uri: sketchfabEmbedUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => <ARLoading label="Loading PSU Model..." />}
      />
    </ARStage>
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1 },
});
