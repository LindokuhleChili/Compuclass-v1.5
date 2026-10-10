import React from 'react';
import { StyleSheet } from 'react-native';
import WebView from './WebEmbed';
import { ARLoading, ARStage } from './ARChrome';

export default function RamAR() {
  const sketchfabEmbedUrl = 'https://sketchfab.com/models/ab2b1c25c31b44c1a757911734bdf942/embed?autostart=1&ui_controls=1&ui_infos=0&ui_inspector=0&ui_stop=0&ui_watermark=0';

  return (
    <ARStage>
      <WebView
        source={{ uri: sketchfabEmbedUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => <ARLoading label="Loading RAM Model..." />}
      />
    </ARStage>
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1 },
});
