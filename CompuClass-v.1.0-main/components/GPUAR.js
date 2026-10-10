import React from 'react';
import { StyleSheet } from 'react-native';
import WebView from './WebEmbed';
import { ARLoading, ARStage } from './ARChrome';

export default function GPUAR() {
  const sketchfabEmbedUrl = 'https://sketchfab.com/models/6f527569f14b4efc94c7072842bd41ac/embed?autostart=1&ui_controls=1&ui_infos=0&ui_inspector=0&ui_stop=0&ui_watermark=0';

  return (
    <ARStage>
      <WebView
        source={{ uri: sketchfabEmbedUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => <ARLoading label="Loading GPU Model..." />}
      />
    </ARStage>
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1 },
});
