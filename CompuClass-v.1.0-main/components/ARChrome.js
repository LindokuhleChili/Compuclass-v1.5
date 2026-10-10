import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { font } from './ui/kit';

export function ARStage({ children, hint }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1 }}>{children}</View>
      {hint ? (
        <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: theme.glassPanel, borderTopWidth: 1, borderTopColor: theme.border }}>
          <Text style={[{ color: theme.textSecondary, fontSize: 13, lineHeight: 18, textAlign: 'center' }, font(theme, 'body')]}>{hint}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function ARLoading({ label }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background, padding: 24 }}>
      <Text style={[{ color: theme.text, fontSize: 16, textAlign: 'center' }, font(theme, 'semibold')]}>{label}</Text>
    </View>
  );
}

export function ARFallback({ title, detail }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background, paddingHorizontal: 28 }}>
      <Text style={[{ color: theme.text, fontSize: 20, lineHeight: 28, textAlign: 'center', marginBottom: 12 }, font(theme, 'h2')]}>{title}</Text>
      <Text style={[{ color: theme.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' }, font(theme, 'body')]}>{detail}</Text>
    </View>
  );
}
