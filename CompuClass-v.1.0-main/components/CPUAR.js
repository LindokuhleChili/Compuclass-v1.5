import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import WebView from './WebEmbed';
import { ARFallback, ARLoading, ARStage } from './ARChrome';

export default function CPUAR() {
  const sketchfabEmbedUrl = 'https://sketchfab.com/models/a50bafa2d9914caa9bf185cd16e6935f/embed?autostart=1&ui_controls=1&ui_infos=0&ui_inspector=0&ui_stop=0&ui_watermark=0';
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <ARFallback
        title="The CPU model didn't load"
        detail="Check your connection, then open this view again. You can still finish the PC Lab steps without the 3D model."
      />
    );
  }

  return (
    <ARStage hint="If the model stays blank, it didn't load. Go back and continue the assembly steps.">
      <WebView
        source={{ uri: sketchfabEmbedUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
        renderLoading={() => <ARLoading label="Loading CPU Model..." />}
      />
    </ARStage>
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1 },
});
