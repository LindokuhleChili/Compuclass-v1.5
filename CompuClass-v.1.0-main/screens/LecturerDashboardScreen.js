import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, Modal, Share, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { lecturerService } from '../services/lecturerService';
import { getErrorMessage } from '../utils/errorMessages';
import ClassScopePicker from '../components/ClassScopePicker';
import { appTheme, useTheme } from '../context/ThemeContext';
import {
  Page, Heading, Body, Card, Glass, Badge, Button, IconTile, SectionHeader, Skeleton, font,
} from '../components/ui/kit';

const BLUE = appTheme.primary;
const WHITE = appTheme.surface;
const TEXT = appTheme.text;
const MUTED = appTheme.textSecondary;
const BORDER = appTheme.border;
const BG = appTheme.background;

const quickActions = (navigation, service) => [
  { icon: 'user', label: 'Student progress', tone: 'blue', onPress: () => navigation.navigate('StudentProgress') },
  { icon: 'school', label: 'Classes', tone: 'teal', onPress: () => navigation.navigate('ClassManagement') },
  { icon: 'folder', label: 'Upload content', tone: 'blue', onPress: async () => {
    try {
      const folders = await service.getFolders();
      let folderId = folders?.[0]?.id;
      if (!folderId) {
        const created = await service.createFolder('General', 'General documents');
        folderId = created.id;
      }
      navigation.navigate('ContentUpload', { folderId });
    } catch (error) { Alert.alert('Error', getErrorMessage(error, { context: 'LecturerDashboard' })); }
  }},
  { icon: 'quiz', label: 'Create quiz', tone: 'yellow', onPress: async () => {
    try {
      const folders = await service.getFolders();
      let folderId = folders?.[0]?.id;
      if (!folderId) {
        const created = await service.createFolder('General', 'General quizzes');
        folderId = created.id;
      }
      navigation.navigate('QuizCreation', { folderId });
    } catch (error) { Alert.alert('Error', getErrorMessage(error, { context: 'LecturerDashboard' })); }
  }},
];

function Stat({ label, value, tone }) {
  return (
    <Glass radius={16} style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Badge label={label} kind={tone} />
    </Glass>
  );
}

export default function LecturerDashboardScreen({ navigation }) {
  const { theme } = useTheme();
  const [folders, setFolders] = useState([]);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [announcementClassId, setAnnouncementClassId] = useState(null);
  const [folderClassId, setFolderClassId] = useState(null);
  const [status, setStatus] = useState('loading');
  const loadRef = useRef(() => {});

  const loadHome = async () => {
    try {
      const [folderData, classData] = await Promise.all([
        lecturerService.getFolders(),
        lecturerService.getClasses(),
      ]);
      setFolders(Array.isArray(folderData) ? folderData : []);
      setClasses(Array.isArray(classData) ? classData : []);
      setStatus('ready');
    } catch (error) {
      setStatus('error');
      Alert.alert('Error', getErrorMessage(error, { context: 'LecturerDashboard' }));
    }
  };
  loadRef.current = loadHome;
  useFocusEffect(useCallback(() => { loadRef.current(); }, []));

  const handlePostAnnouncement = async () => {
    if (!announcementTitle.trim()) { Alert.alert('Error', 'Please enter a title'); return; }
    setLoading(true);
    try {
      const { supabase } = await import('../config/supabase');
      const row = { title: announcementTitle.trim(), body: announcementBody.trim() };
      if (announcementClassId) row.class_id = announcementClassId;
      const { error } = await supabase.from('announcements').insert(row);
      if (error) throw error;
      setShowAnnouncement(false); setAnnouncementTitle(''); setAnnouncementBody(''); setAnnouncementClassId(null);
      Alert.alert('Posted', announcementClassId ? 'Announcement sent to that class.' : 'Announcement sent to all students.');
    } catch (error) { Alert.alert('Error', getErrorMessage(error, { context: 'LecturerDashboard' })); }
    finally { setLoading(false); }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) { Alert.alert('Error', 'Please enter a folder name'); return; }
    setLoading(true);
    try {
      await lecturerService.createFolder(folderName, folderDescription, folderClassId);
      setShowCreateFolder(false); setFolderName(''); setFolderDescription(''); setFolderClassId(null);
      loadHome();
      Alert.alert('Success', 'Folder created successfully');
    } catch (error) { Alert.alert('Error', getErrorMessage(error, { context: 'LecturerDashboard' })); }
    finally { setLoading(false); }
  };

  const handleDeleteFolder = (folderId) => {
    Alert.alert('Delete Folder', 'Are you sure? This will delete all content inside.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await lecturerService.deleteFolder(folderId); loadHome(); Alert.alert('Success', 'Folder deleted'); }
        catch (error) { Alert.alert('Error', getErrorMessage(error, { context: 'LecturerDashboard' })); }
      }},
    ]);
  };

  const enrolled = classes.reduce((sum, item) => sum + (Number(item.student_count) || 0), 0);
  const actions = quickActions(navigation, lecturerService);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Page>
        <Heading level={1} style={{ marginTop: 8 }}>Lecturer</Heading>
        <Body style={{ marginTop: 4, marginBottom: 20 }}>Manage classes, materials, and quizzes.</Body>

        {status === 'loading' ? (
          <View accessibilityRole="progressbar">
            <Skeleton height={88} radius={16} />
            <Skeleton height={72} radius={16} style={{ marginTop: 12 }} />
            <Skeleton height={120} radius={16} style={{ marginTop: 12 }} />
          </View>
        ) : null}

        {status === 'error' ? (
          <Card style={styles.errorCard}>
            <Heading level={3}>Could not refresh your dashboard</Heading>
            <Body variant="small" style={{ marginTop: 6, marginBottom: 12 }}>Check your connection and try again.</Body>
            <Button label="Try again" onPress={loadHome} />
          </Card>
        ) : null}

        {status === 'ready' ? (
          <>
            <View style={styles.statRow}>
              <Stat label="Classes" value={classes.length} tone="info" />
              <Stat label="Students" value={enrolled} tone="ok" />
              <Stat label="Folders" value={folders.length} tone="neutral" />
            </View>

            <View style={styles.actionRow}>
              <Button label="Post announcement" icon="bell" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setAnnouncementClassId(null); setShowAnnouncement(true); }} />
              <Button label="New folder" variant="secondary" icon="plus" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setFolderClassId(null); setShowCreateFolder(true); }} />
            </View>

            <SectionHeader title="Quick actions" />
            <View style={styles.grid}>
              {actions.map((action) => (
                <TouchableOpacity key={action.label} onPress={action.onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={action.label} style={styles.gridItem}>
                  <Card style={styles.actionCard}>
                    <IconTile name={action.icon} tone={action.tone} />
                    <Text style={[{ color: theme.text, marginTop: 10, textAlign: 'center' }, font(theme, 'semibold')]}>{action.label}</Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>

            <SectionHeader title="Your classes" action="Manage" onAction={() => navigation.navigate('ClassManagement')} />
            {classes.length === 0 ? (
              <Card style={styles.emptyCard}>
                <IconTile name="school" tone="teal" />
                <Body style={{ marginTop: 10, textAlign: 'center' }}>No classes yet. Create one so students can join with a code.</Body>
                <Button label="Create a class" fit style={{ marginTop: 12 }} onPress={() => navigation.navigate('ClassManagement')} />
              </Card>
            ) : classes.map((item) => (
              <TouchableOpacity key={item.id} onPress={() => navigation.navigate('ClassDetail', { classId: item.id })} accessibilityRole="button" accessibilityLabel={`Open ${item.name}`}>
                <Card style={styles.classCard}>
                  <IconTile name="school" tone="teal" />
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: theme.text }, font(theme, 'h3')]}>{item.name}</Text>
                    <Body variant="caption">{item.student_count || 0} students{item.join_code ? ` · ${item.join_code}` : ''}</Body>
                  </View>
                  {item.join_code ? (
                    <TouchableOpacity
                      onPress={() => { Clipboard.setString(item.join_code); Alert.alert('Copied', 'Class code copied.'); }}
                      accessibilityRole="button"
                      accessibilityLabel={`Copy code ${item.join_code}`}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[{ color: theme.primary }, font(theme, 'semibold')]}>Copy</Text>
                    </TouchableOpacity>
                  ) : <Badge label="No code" kind="warning" />}
                </Card>
              </TouchableOpacity>
            ))}

            <View style={{ height: 8 }} />
            <SectionHeader title="Your folders" />
            {folders.length === 0 ? (
              <Card style={styles.emptyCard}>
                <IconTile name="folder" tone="blue" />
                <Body style={{ marginTop: 10, textAlign: 'center' }}>No folders yet. Create one to hold documents and quizzes.</Body>
              </Card>
            ) : folders.map((folder) => (
              <Card key={folder.id} style={styles.classCard}>
                <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('FolderContent', { folder }); }} accessibilityRole="button" accessibilityLabel={`Open folder ${folder.name}`}>
                  <IconTile name="folder" tone="blue" />
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: theme.text }, font(theme, 'h3')]}>{folder.name}</Text>
                    {folder.description ? <Body variant="caption" numberOfLines={2}>{folder.description}</Body> : null}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteFolder(folder.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={`Delete folder ${folder.name}`}>
                  <Ionicons name="trash-outline" size={18} color={theme.error} />
                </TouchableOpacity>
              </Card>
            ))}
          </>
        ) : null}
      </Page>

      <Modal visible={showAnnouncement} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Post announcement</Text>
            <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholder="Title" placeholderTextColor={MUTED} value={announcementTitle} onChangeText={setAnnouncementTitle} />
            <TextInput style={[styles.input, styles.textArea, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholder="Message to students..." placeholderTextColor={MUTED} value={announcementBody} onChangeText={setAnnouncementBody} multiline />
            <ClassScopePicker classes={classes} value={announcementClassId} onChange={setAnnouncementClassId} textColor={theme.text} mutedColor={theme.textSecondary} accent={theme.primary} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setShowAnnouncement(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handlePostAnnouncement} disabled={loading}>
                <Text style={styles.saveBtnText}>{loading ? 'Posting...' : 'Post'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => announcementTitle.trim() && Share.share({ message: `${announcementTitle}\n\n${announcementBody}` })} accessibilityRole="button" accessibilityLabel="Share announcement text">
              <Text style={[{ color: theme.primary, textAlign: 'center', marginTop: 8 }, font(theme, 'semibold')]}>Share text</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCreateFolder} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Create new folder</Text>
            <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholder="Folder Name" placeholderTextColor={MUTED} value={folderName} onChangeText={setFolderName} />
            <TextInput style={[styles.input, styles.textArea, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} placeholder="Description (optional)" placeholderTextColor={MUTED} value={folderDescription} onChangeText={setFolderDescription} multiline />
            <ClassScopePicker classes={classes} value={folderClassId} onChange={setFolderClassId} textColor={theme.text} mutedColor={theme.textSecondary} accent={theme.primary} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setShowCreateFolder(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateFolder} disabled={loading}>
                <Text style={styles.saveBtnText}>{loading ? 'Creating...' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat: { flex: 1, padding: 14, alignItems: 'flex-start', gap: 8 },
  statValue: { fontSize: 28, fontWeight: '800', color: TEXT },
  actionRow: { gap: 10, marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  gridItem: { width: '48%' },
  actionCard: { alignItems: 'center', padding: 16, minHeight: 120, justifyContent: 'center' },
  classCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 10 },
  emptyCard: { alignItems: 'center', padding: 24, marginBottom: 16 },
  errorCard: { padding: 20 },
  folderRow: { marginBottom: 0 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(11,27,58,0.45)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 14, fontWeight: '600', backgroundColor: BG, borderColor: BORDER, color: TEXT },
  textArea: { height: 80, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  cancelBtnText: { color: MUTED, fontWeight: '700' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: BLUE, alignItems: 'center' },
  saveBtnText: { color: WHITE, fontWeight: '800' },
});
