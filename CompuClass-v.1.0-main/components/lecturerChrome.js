import React, { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useShellBack } from '../context/ChromeContext';
import { leaveScreen } from '../utils/screenNav';
import { Body, Glass, Heading, IconButton, font } from './ui/kit';

export const LECTURER_COLUMN = 960;

export function confirmNamed({ title, message, confirmLabel }) {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export function useUndoToast() {
  const [toast, setToast] = useState(null);
  const commitRef = useRef(null);
  const timer = useRef(null);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => () => {
    const job = commitRef.current;
    commitRef.current = null;
    clearTimer();
    if (job) job();
  }, []);

  const offer = ({ message, commit, undo }) => {
    const previous = commitRef.current;
    commitRef.current = null;
    clearTimer();
    if (previous) previous();
    commitRef.current = commit || null;
    setToast({
      message,
      onUndo: undo ? () => {
        commitRef.current = null;
        clearTimer();
        setToast(null);
        undo();
      } : null,
    });
    timer.current = setTimeout(() => {
      const job = commitRef.current;
      commitRef.current = null;
      setToast(null);
      if (job) job();
    }, 5000);
  };

  const show = (message) => offer({ message });

  return { toast, offer, show };
}

export function ToastBanner({ toast }) {
  const { theme } = useTheme();
  if (!toast?.message) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center', zIndex: 40, paddingHorizontal: 16 }}>
      <Glass strong radius={16} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, maxWidth: 480, width: '100%' }}>
        <Text style={[{ flex: 1, color: theme.text, fontSize: 14 }, font(theme, 'medium')]}>{toast.message}</Text>
        {toast.onUndo ? (
          <Pressable onPress={toast.onUndo} accessibilityRole="button" accessibilityLabel="Undo" style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}>
            <Text style={[{ color: theme.primary, fontSize: 15 }, font(theme, 'semibold')]}>Undo</Text>
          </Pressable>
        ) : null}
      </Glass>
    </View>
  );
}

export function ActionMenu({ label, items }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton name="more" label={label} onPress={() => setOpen(true)} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(11,27,58,0.45)', justifyContent: 'flex-end', padding: 16 }} onPress={() => setOpen(false)} accessibilityLabel="Close menu">
          <Pressable onPress={() => {}}>
            <Glass strong radius={24} style={{ paddingVertical: 8, marginBottom: 8 }}>
              {items.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => { setOpen(false); item.onPress(); }}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 20 }}
                >
                  <Text style={[{ fontSize: 16, color: item.destructive ? theme.error : theme.text }, font(theme, 'semibold')]}>{item.label}</Text>
                </Pressable>
              ))}
            </Glass>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function ScreenHeading({ navigation, title, subtitle, trailing }) {
  const shellBack = useShellBack();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 8, marginBottom: 16 }}>
      {!shellBack && navigation ? (
        <IconButton name="chevLeft" label="Go back" onPress={() => leaveScreen(navigation)} />
      ) : null}
      <View style={{ flex: 1, paddingTop: navigation && !shellBack ? 6 : 0 }}>
        <Heading level={1}>{title}</Heading>
        {subtitle ? <Body variant="caption" style={{ marginTop: 4 }}>{subtitle}</Body> : null}
      </View>
      {trailing ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{trailing}</View> : null}
    </View>
  );
}
