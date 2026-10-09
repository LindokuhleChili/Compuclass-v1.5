import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../services/authService';
import { supabase } from '../config/supabase';
import { saveTextFile } from '../utils/fileDownload';
import { getErrorMessage } from '../utils/errorMessages';
import { useTheme } from '../context/ThemeContext';
import { Icon } from '../components/ui/Icon';
import {
  Page, Heading, Card, IconTile, Toggle, Skeleton, Sheet, Body, font, useLayout,
} from '../components/ui/kit';

function Row({ icon, tone = 'blue', label, subtitle, onPress, trailing }) {
  const { theme } = useTheme();
  const inner = (
    <>
      <IconTile name={icon} tone={tone} />
      <View style={{ flex: 1 }}>
        <Text style={[{ color: theme.text }, font(theme, 'h3')]}>{label}</Text>
        {subtitle ? <Text style={[{ fontSize: 14, lineHeight: 20, color: theme.textSecondary }, font(theme, 'body')]}>{subtitle}</Text> : null}
      </View>
      {trailing || <Icon name="chev" size={18} color={theme.textTertiary} tone="transparent" />}
    </>
  );
  if (!onPress) {
    return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, minHeight: 72 }}>{inner}</View>;
  }
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, minHeight: 72 }}>
      {inner}
    </Pressable>
  );
}

export default function SettingsScreen({ onLogout }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { laptop } = useLayout();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [about, setAbout] = useState(false);

  useEffect(() => { loadUser(); loadSettings(); }, []);

  const loadUser = async () => {
    try { setUser(await authService.getCurrentUser()); }
    finally { setReady(true); }
  };

  const loadSettings = async () => {
    try {
      const vals = await AsyncStorage.multiGet(['notifications', 'soundEffects']);
      vals.forEach(([key, val]) => {
        if (val !== null) {
          if (key === 'notifications') setNotifications(JSON.parse(val));
          if (key === 'soundEffects') setSoundEffects(JSON.parse(val));
        }
      });
    } catch { /* keep defaults */ }
  };

  const saveSetting = async (key, value) => { await AsyncStorage.setItem(key, JSON.stringify(value)); };

  const handleExportData = async () => {
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const exportData = JSON.stringify({ user: { email: user.email, name: user.user_metadata?.full_name }, profile, exportDate: new Date().toISOString() }, null, 2);
      const outcome = await saveTextFile(`compuclass_data_${Date.now()}.json`, exportData);
      if (outcome === 'downloaded') Alert.alert('Success', 'Your data has been downloaded.');
      else if (outcome !== 'shared') Alert.alert('Success', 'Data exported to: ' + outcome);
    } catch (error) { Alert.alert('Error', getErrorMessage(error, { context: 'ExportData', fallback: 'Failed to export data' })); }
  };

  const signOut = () => {
    Alert.alert('Sign out', 'Sign out of CompuClass on this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { try { await authService.signOut(); onLogout?.(); } catch { Alert.alert('Error', 'Failed to logout. Please try again.'); } } },
    ]);
  };

  const name = user?.user_metadata?.full_name || user?.profile?.full_name;

  const account = (
    <View>
      <Heading level={2} style={{ marginBottom: 16 }}>Account</Heading>
      <Card>
        {!ready ? (
          <View style={{ padding: 16, gap: 12 }}><Skeleton height={48} /><Skeleton height={48} /></View>
        ) : (
          <>
            <Row icon="user" label="Personal details" subtitle={name && user?.email ? `${name} · ${user.email}` : 'Name and email'} onPress={() => navigation.navigate('Profile')} />
            <View style={{ height: 1, backgroundColor: theme.borderLight, marginHorizontal: 16 }} />
            <Row icon="lock" tone="neutral" label="Password" subtitle="Change it from your profile" onPress={() => navigation.navigate('Profile')} />
            <View style={{ height: 1, backgroundColor: theme.borderLight, marginHorizontal: 16 }} />
            <Row icon="download" tone="teal" label="Export my data" subtitle="Download your learning data" onPress={handleExportData} />
          </>
        )}
      </Card>
      <Heading level={2} style={{ marginTop: 32, marginBottom: 16 }}>Learning</Heading>
      <Card>
        <Row icon="bell" tone="teal" label="Notifications" subtitle="Reminders saved on this device" trailing={<Toggle value={notifications} label="Notifications" onValueChange={(v) => { setNotifications(v); saveSetting('notifications', v); }} />} />
        <View style={{ height: 1, backgroundColor: theme.borderLight, marginHorizontal: 16 }} />
        <Row icon="target" tone="yellow" label="Sound effects" subtitle="Sounds in labs and games" trailing={<Toggle value={soundEffects} label="Sound effects" onValueChange={(v) => { setSoundEffects(v); saveSetting('soundEffects', v); }} />} />
      </Card>
    </View>
  );

  const display = (
    <View>
      <Heading level={2} style={{ marginBottom: 16 }}>Display</Heading>
      <Card>
        <Row icon="sun" label="Appearance" subtitle="Soft Glass light" trailing={<Text style={[{ color: theme.textSecondary, fontSize: 14 }, font(theme, 'body')]}>Light</Text>} />
        <View style={{ height: 1, backgroundColor: theme.borderLight, marginHorizontal: 16 }} />
        <Row icon="type" tone="teal" label="Text size" subtitle="Follows your device" trailing={<Text style={[{ color: theme.textSecondary, fontSize: 14 }, font(theme, 'body')]}>Default</Text>} />
      </Card>
      <Heading level={2} style={{ marginTop: 32, marginBottom: 16 }}>Support</Heading>
      <Card>
        <Row icon="help" label="Help and feedback" subtitle="Ask CompuBot or your teacher" onPress={() => navigation.navigate('Chatbot')} />
        <View style={{ height: 1, backgroundColor: theme.borderLight, marginHorizontal: 16 }} />
        <Row icon="info" tone="neutral" label="About CompuClass" subtitle="Version 1.0.0" onPress={() => setAbout(true)} />
        <View style={{ height: 1, backgroundColor: theme.borderLight, marginHorizontal: 16 }} />
        <Row icon="logout" tone="neutral" label="Sign out" subtitle="" onPress={signOut} />
      </Card>
    </View>
  );

  return (
    <Page>
      <View style={{ marginTop: 8, marginBottom: 24 }}>
        <Heading level={1}>Settings</Heading>
      </View>
      <View style={laptop ? { flexDirection: 'row', gap: 40, alignItems: 'flex-start' } : { gap: 8 }}>
        <View style={{ flex: 1 }}>{account}</View>
        <View style={{ flex: 1, marginTop: laptop ? 0 : 32 }}>{display}</View>
      </View>
      <Sheet visible={about} onClose={() => setAbout(false)} title="About CompuClass">
        <Body>Version 1.0.0</Body>
        <Body style={{ marginTop: 8 }}>Interactive computer learning platform.</Body>
        <Body variant="small" style={{ marginTop: 16 }}>© {new Date().getFullYear()} CompuClass</Body>
      </Sheet>
    </Page>
  );
}
