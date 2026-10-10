import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { supabase } from '../config/supabase';
import { openStoredDocument } from '../utils/fileDownload';
import { getErrorMessage } from '../utils/errorMessages';
import { classService } from '../services/classService';
import { filterByClassScope } from '../utils/classScope';
import { useTheme } from '../context/ThemeContext';
import { Icon } from '../components/ui/Icon';
import {
  Page, Heading, Body, Card, Badge, Button, IconTile, IconButton, font, useLayout,
} from '../components/ui/kit';

function folderTone(name = '') {
  const n = name.toLowerCase();
  if (n.includes('window')) return { icon: 'windows', tone: 'teal' };
  if (n.includes('network') || n.includes('internet')) return { icon: 'wifi', tone: 'teal' };
  if (n.includes('safe') || n.includes('security')) return { icon: 'shield', tone: 'teal' };
  if (n.includes('hardware') || n.includes('pc')) return { icon: 'cpu', tone: 'blue' };
  if (n.includes('trouble')) return { icon: 'wrench', tone: 'blue' };
  return { icon: 'folder', tone: 'blue' };
}

export default function StudentMaterialsScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { laptop } = useLayout();
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [filter, setFilter] = useState('All');

  useEffect(() => { loadFolders(); }, []);
  useEffect(() => { if (selectedFolder) loadFolderContent(selectedFolder.id); }, [selectedFolder]);
  useEffect(() => {
    const folderId = route?.params?.folderId;
    if (!folderId || !folders.length) return;
    const match = folders.find((folder) => folder.id === folderId);
    if (match) setSelectedFolder(match);
  }, [folders, route?.params?.folderId]);

  const loadFolders = async () => {
    try {
      const scope = await classService.classScopeForCurrentUser();
      const { data, error } = await supabase.from('folders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setFolders(filterByClassScope(data, scope));
    } catch (error) { Alert.alert('Error', getErrorMessage(error, { context: 'StudentMaterials' })); }
    finally { setLoading(false); }
  };

  const loadFolderContent = async (folderId) => {
    try {
      const [docsRes, quizzesRes] = await Promise.all([
        supabase.from('documents').select('*').eq('folder_id', folderId),
        supabase.from('quizzes').select('*, quiz_questions(id)').eq('folder_id', folderId),
      ]);
      if (docsRes.error) throw docsRes.error;
      if (quizzesRes.error) throw quizzesRes.error;
      const nextQuizzes = quizzesRes.data || [];
      const ids = nextQuizzes.map((quiz) => quiz.id).filter(Boolean);
      let counts = null;
      if (ids.length > 0 && typeof supabase.rpc === 'function') {
        const countRes = await supabase.rpc('quiz_question_counts', { p_quiz_ids: ids });
        if (!countRes.error && Array.isArray(countRes.data)) {
          counts = Object.fromEntries(countRes.data.map((row) => [row.quiz_id, row.question_count]));
        }
      }
      const scope = await classService.classScopeForCurrentUser();
      setDocuments(filterByClassScope(docsRes.data, scope));
      setQuizzes(counts
        ? nextQuizzes.map((quiz) => ({ ...quiz, quiz_questions: Array.from({ length: counts[quiz.id] || 0 }) }))
        : nextQuizzes);
    } catch (error) { Alert.alert('Error', getErrorMessage(error, { context: 'StudentMaterials' })); }
  };

  const openDocument = async (doc) => {
    try {
      if (!doc.file_url) { Alert.alert('Error', 'No file URL available'); return; }
      const outcome = await openStoredDocument(doc.file_url, doc.file_name || `${doc.title}.pdf`);
      if (outcome === 'downloaded') Alert.alert('Success', 'File downloaded');
    } catch (error) { Alert.alert('Error', getErrorMessage(error, { context: 'StudentMaterials', fallback: 'Failed to download document' })); }
  };

  if (selectedFolder) {
    const tone = folderTone(selectedFolder.name);
    return (
      <Page>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <IconButton name="chevLeft" label="Back to materials" onPress={() => { setSelectedFolder(null); navigation.setParams?.({ folderId: undefined, folderName: undefined }); }} />
          <Heading level={1} style={{ flex: 1 }}>{selectedFolder.name}</Heading>
        </View>
        <Heading level={2} style={{ marginBottom: 12 }}>Documents</Heading>
        {documents.length === 0 ? <Body variant="small" style={{ marginBottom: 24 }}>No documents in this folder.</Body> : documents.map((doc) => (
          <Pressable key={doc.id} onPress={() => openDocument(doc)} accessibilityRole="button" accessibilityLabel={`Open ${doc.title}`} style={{ marginBottom: 12 }}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, minHeight: 72 }}>
              <IconTile name="folder" tone={tone.tone} />
              <Text style={[{ flex: 1, color: theme.text }, font(theme, 'semibold')]}>{doc.title}</Text>
              <Icon name="download" size={20} color={theme.primary} />
            </Card>
          </Pressable>
        ))}
        <Heading level={2} style={{ marginTop: 16, marginBottom: 12 }}>Quizzes</Heading>
        {quizzes.length === 0 ? <Body variant="small">No quizzes in this folder.</Body> : quizzes.map((quiz) => (
          <Pressable key={quiz.id} onPress={() => navigation.navigate('Quiz', { quizId: quiz.id })} accessibilityRole="button" accessibilityLabel={`Start ${quiz.title}`} style={{ marginBottom: 12 }}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, minHeight: 72 }}>
              <IconTile name="quiz" tone="teal" />
              <View style={{ flex: 1 }}>
                <Text style={[{ color: theme.text }, font(theme, 'h3')]}>{quiz.title}</Text>
                <Body variant="small">{quiz.quiz_questions?.length || 0} questions</Body>
              </View>
              <Button label="Start" fit onPress={() => navigation.navigate('Quiz', { quizId: quiz.id })} style={{ height: 44, minHeight: 44 }} />
            </Card>
          </Pressable>
        ))}
      </Page>
    );
  }

  const chips = ['All', ...Array.from(new Set(folders.map((f) => f.name))).slice(0, 5)];
  const shown = filter === 'All' ? folders : folders.filter((f) => f.name === filter);
  const featured = folders[0];

  return (
    <Page>
      <View style={{ marginTop: 8, marginBottom: 24 }}>
        <Heading level={1}>Learning materials</Heading>
        <Body style={{ marginTop: 4 }}>{loading ? 'Loading your modules' : `${folders.length} ${folders.length === 1 ? 'module' : 'modules'}`}</Body>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {chips.map((chip) => {
          const on = chip === filter;
          return (
            <Pressable key={chip} onPress={() => setFilter(chip)} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ height: 44, paddingHorizontal: 16, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? theme.yellowTint : theme.surface, borderWidth: 1, borderColor: on ? theme.yellow : theme.border }}>
              <Text style={[{ fontSize: 14, color: on ? theme.yellowInk : theme.textSecondary }, font(theme, 'semibold')]}>{chip}</Text>
            </Pressable>
          );
        })}
      </View>
      {featured && filter === 'All' ? (
        <View style={{ borderRadius: 16, padding: laptop ? 24 : 16, marginBottom: 24, backgroundColor: '#E7F3F8', borderWidth: 1, borderColor: theme.border, flexDirection: laptop ? 'row' : 'column', alignItems: laptop ? 'center' : 'flex-start', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Badge label="Up next" kind="yellowStrong" />
            <Text style={[{ color: theme.text, marginTop: 8 }, font(theme, 'h2')]}>{featured.name}</Text>
            {featured.description ? <Body variant="small">{featured.description}</Body> : null}
          </View>
          <Button label="Open module" fit onPress={() => setSelectedFolder(featured)} style={{ height: 44, minHeight: 44 }} />
        </View>
      ) : null}
      {shown.length === 0 && !loading ? (
        <Card style={{ padding: 32, alignItems: 'center' }}>
          <IconTile name="folder" tone="teal" />
          <Heading level={3} style={{ marginTop: 16 }}>No folders yet</Heading>
          <Body variant="small" style={{ marginTop: 4, textAlign: 'center' }}>Your lecturer will add materials here.</Body>
        </Card>
      ) : (
        <View style={{ gap: 12, flexDirection: 'row', flexWrap: 'wrap' }}>
          {shown.map((folder) => {
            const tone = folderTone(folder.name);
            return (
              <Pressable key={folder.id} onPress={() => setSelectedFolder(folder)} accessibilityRole="button" accessibilityLabel={folder.name} style={{ width: laptop ? '48%' : '100%' }}>
                <Card style={{ flexDirection: 'row', gap: 16, padding: 16, alignItems: 'flex-start', minHeight: 120 }}>
                  <IconTile name={tone.icon} tone={tone.tone} />
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: theme.text }, font(theme, 'h3')]}>{folder.name}</Text>
                    {folder.description ? <Body variant="small" style={{ marginVertical: 8 }}>{folder.description}</Body> : <View style={{ height: 8 }} />}
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: '#E6EDF4', overflow: 'hidden' }}>
                      <View style={{ width: '12%', height: '100%', backgroundColor: tone.tone === 'teal' ? theme.accent : theme.primary }} />
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </Page>
  );
}
