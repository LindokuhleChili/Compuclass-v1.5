import React from 'react';
import { View, StyleSheet } from 'react-native';
import { usePageMeta } from '../utils/pageMeta';
import { useTheme } from '../context/ThemeContext';
import { ColourField, Heading, Body, Button, Mark, Wordmark } from '../components/ui/kit';

export default function NotFoundScreen({ onGoHome }) {
  usePageMeta('NotFound');
  const { theme } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ColourField />
      <View style={styles.top}>
        <Mark size={44} />
        <Wordmark />
      </View>
      <View style={styles.body}>
        <Heading level="display" style={{ color: theme.primary, marginBottom: 8 }}>404</Heading>
        <Heading level={1} style={{ marginBottom: 8, textAlign: 'center' }}>Page not found</Heading>
        <Body style={{ textAlign: 'center', marginBottom: 24, maxWidth: 360 }}>
          The page you are looking for does not exist or may have been moved.
        </Body>
        <Button label="Go to CompuClass home" icon="home" onPress={onGoHome} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', padding: 20, zIndex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 1 },
});
