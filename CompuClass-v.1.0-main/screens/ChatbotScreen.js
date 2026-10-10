import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Keyboard,
  Image, Clipboard, ToastAndroid, Alert, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { progressService } from '../services/progressService';
import { aiService } from '../services/aiService';
import { COMPUBOT_MAX_CHARS, compuBotErrorMessage } from '../utils/compuBotError';
import { useTheme } from '../context/ThemeContext';
import { useShellBack } from '../context/ChromeContext';
import { leaveScreen } from '../utils/screenNav';
import { Glass, IconButton, Heading, Body, IconTile, font, useLayout } from '../components/ui/kit';

const CHAT_STORAGE_KEY = 'compubot_chat_history';

const QUICK_PROMPTS = [
  { label: 'What is a CPU?', text: 'What is a CPU and what does it do?' },
  { label: 'RAM vs Storage', text: 'What is the difference between RAM and storage?' },
  { label: 'PC won\'t turn on', text: 'My PC won\'t turn on. How do I troubleshoot it?' },
  { label: 'Quiz tips', text: 'Give me tips to prepare for a computer hardware quiz.' },
  { label: 'What is a PSU?', text: 'What is a PSU and why is it important?' },
  { label: 'Motherboard explained', text: 'Explain what a motherboard does in simple terms.' },
];

function TypingDots() {
  const { theme } = useTheme();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot, delay) => Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(600),
      ])
    ).start();
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.dots}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: theme.primary, transform: [{ translateY: dot }] }} />
      ))}
    </View>
  );
}

function GlassHit({ name, label, onPress, color }) {
  const { theme } = useTheme();
  return (
    <Pressable
      className="cc-glass"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [{
        width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
        backgroundColor: theme.glassFill, borderWidth: 1, borderColor: theme.glassBorder, opacity: pressed ? 0.85 : 1,
      }, Platform.OS === 'web' ? { backdropFilter: 'blur(28px) saturate(1.5)' } : null]}
    >
      <Ionicons name={name} size={20} color={color || theme.text} />
    </Pressable>
  );
}

export default function ChatbotScreen({ navigation, route }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const listRef = useRef(null);
  const { theme } = useTheme();
  const shellBack = useShellBack();
  const insets = useSafeAreaInsets();
  const { phone, laptop, horizontal, bottom } = useLayout();
  const context = route?.params?.context || null;
  const chatHydrated = useRef(false);

  useEffect(() => {
    progressService.get(CHAT_STORAGE_KEY).then((saved) => {
      if (Array.isArray(saved)) setMessages(saved);
      chatHydrated.current = true;
    });
  }, []);

  useEffect(() => {
    if (!chatHydrated.current) return;
    progressService.set(CHAT_STORAGE_KEY, messages);
  }, [messages]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => { show?.remove?.(); hide?.remove?.(); };
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const sendMessage = useCallback(async (text, imageBase64 = null) => {
    const trimmed = (text || input).trim();
    if ((!trimmed && !imageBase64) || loading) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: trimmed,
      image: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : null,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setSelectedImage(null);
    setLoading(true);
    scrollToBottom();

    try {
      const recentMessages = updatedMessages.slice(-10);
      const reply = await aiService.chatWithAI(recentMessages, context, imageBase64);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: reply, timestamp: new Date().toISOString() }]);
    } catch (error) {
      const text = compuBotErrorMessage(error);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text, timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [input, messages, loading, context]);

  const clearChat = () => {
    setMessages([]);
    progressService.set(CHAT_STORAGE_KEY, []);
  };

  const copyMessage = (text) => {
    Clipboard.setString(text);
    if (Platform.OS === 'android') ToastAndroid.show('Copied!', ToastAndroid.SHORT);
    else Alert.alert('Copied!');
  };

  const speakMessage = (text, id) => {
    if (speakingId === id) {
      Speech.stop();
      setSpeakingId(null);
    } else {
      Speech.stop();
      setSpeakingId(id);
      Speech.speak(text, { onDone: () => setSpeakingId(null), onError: () => setSpeakingId(null) });
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!result.canceled) setSelectedImage(result.assets[0]);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (!result.canceled) setSelectedImage(result.assets[0]);
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const inputInset = keyboardOpen ? Math.max(insets.bottom, 12) : (phone ? bottom : 24);
  const bubbleMax = laptop ? 400 : '78%';

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAI]}>
        {!isUser && <IconTile name="bot" tone="teal" size={44} />}
        <Pressable
          onLongPress={() => copyMessage(item.text)}
          accessibilityRole="text"
          accessibilityLabel={item.text || 'Image message'}
          style={{ maxWidth: bubbleMax, flexShrink: 1 }}
        >
          {isUser ? (
            <View style={[styles.bubble, { backgroundColor: theme.primary, borderBottomRightRadius: 4 }]}>
              {item.image && <Image source={{ uri: item.image }} style={styles.msgImage} resizeMode="cover" />}
              {item.text ? <Text style={[{ fontSize: 15, lineHeight: 22, color: theme.surface }, font(theme, 'body')]}>{item.text}</Text> : null}
              <View style={styles.msgMeta}>
                <Text style={[{ fontSize: 11, color: theme.secondary }, font(theme, 'medium')]}>{formatTime(item.timestamp)}</Text>
              </View>
            </View>
          ) : (
            <Glass strong radius={16} style={[styles.bubble, { borderBottomLeftRadius: 4 }]}>
              {item.image && <Image source={{ uri: item.image }} style={styles.msgImage} resizeMode="cover" />}
              {item.text ? <Text style={[{ fontSize: 15, lineHeight: 22, color: theme.text }, font(theme, 'body')]}>{item.text}</Text> : null}
              <View style={styles.msgMeta}>
                <Text style={[{ fontSize: 11, color: theme.textTertiary }, font(theme, 'medium')]}>{formatTime(item.timestamp)}</Text>
                <Pressable
                  onPress={() => speakMessage(item.text, item.id)}
                  style={styles.speakBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Read aloud"
                >
                  <Ionicons name={speakingId === item.id ? 'volume-high' : 'volume-medium-outline'} size={16} color={speakingId === item.id ? theme.primary : theme.textTertiary} />
                </Pressable>
              </View>
            </Glass>
          )}
        </Pressable>
      </View>
    );
  };

  const empty = (
    <ScrollView contentContainerStyle={[styles.emptyState, { paddingHorizontal: horizontal }]} keyboardShouldPersistTaps="handled">
      <IconTile name="bot" tone="teal" size={72} />
      <Heading level={2} style={{ textAlign: 'center', marginTop: 16, marginBottom: 8 }}>Ask CompuBot anything</Heading>
      <Body variant="small" style={{ textAlign: 'center', maxWidth: 420, marginBottom: 24 }}>Get help with PC components, troubleshooting, quizzes, and more.</Body>
      <View style={styles.quickGrid}>
        {QUICK_PROMPTS.map((p) => (
          <Pressable
            key={p.label}
            className="cc-glass"
            onPress={() => sendMessage(p.text)}
            accessibilityRole="button"
            accessibilityLabel={p.label}
            style={({ pressed }) => [styles.quickChip, {
              backgroundColor: theme.glassPanel,
              borderColor: theme.glassBorder,
              opacity: pressed ? 0.9 : 1,
            }, Platform.OS === 'web' ? { backdropFilter: 'blur(28px) saturate(1.5)' } : null]}
          >
            <Text style={[{ fontSize: 14, color: theme.text }, font(theme, 'semibold')]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <View testID="compubot-screen" style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.column, { paddingHorizontal: horizontal, paddingTop: shellBack ? 4 : insets.top + 12 }]}>
        <View style={styles.header}>
          {!shellBack && (
            <IconButton name="chevLeft" label="Go back" onPress={() => leaveScreen(navigation)} />
          )}
          <IconTile name="bot" tone="teal" />
          <View style={{ flex: 1 }}>
            <Heading level={3}>CompuBot</Heading>
            <Body variant="caption">AI Learning Assistant</Body>
          </View>
          {messages.length > 0 && (
            <GlassHit name="trash-outline" label="Clear chat" onPress={clearChat} color={theme.textSecondary} />
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
      >
        <View style={[styles.column, styles.fill]}>
          {messages.length === 0 ? empty : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={item => item.id.toString()}
              renderItem={renderMessage}
              contentContainerStyle={[styles.messageList, { paddingHorizontal: horizontal }]}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={scrollToBottom}
              keyboardShouldPersistTaps="handled"
              ListFooterComponent={
                loading ? (
                  <View style={[styles.msgRow, styles.msgRowAI]}>
                    <IconTile name="bot" tone="teal" size={44} />
                    <Glass strong radius={16} style={styles.bubble}>
                      <TypingDots />
                    </Glass>
                  </View>
                ) : null
              }
            />
          )}

          {selectedImage && (
            <View style={{ paddingHorizontal: horizontal, marginBottom: 8 }}>
              <Glass strong radius={16} style={styles.imagePreviewBar}>
                <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                <Pressable onPress={() => setSelectedImage(null)} style={styles.removeImageBtn} accessibilityRole="button" accessibilityLabel="Remove image">
                  <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                </Pressable>
                <Text style={[{ fontSize: 13, color: theme.textSecondary }, font(theme, 'medium')]}>Image ready to send</Text>
              </Glass>
            </View>
          )}

          <View style={{ paddingHorizontal: horizontal, paddingBottom: inputInset, paddingTop: 8 }}>
            <Glass strong radius={24} style={styles.inputBar}>
              <GlassHit name="camera-outline" label="Take photo" onPress={takePhoto} color={theme.textSecondary} />
              <GlassHit name="image-outline" label="Choose image" onPress={pickImage} color={theme.textSecondary} />
              <View style={styles.inputColumn}>
                <TextInput
                  style={[styles.input, {
                    color: theme.text,
                    backgroundColor: theme.surface,
                    borderColor: theme.inputBorder,
                    borderRadius: theme.radiusButton,
                  }, font(theme, 'body')]}
                  placeholder="Ask a question..."
                  placeholderTextColor={theme.textTertiary}
                  value={input}
                  onChangeText={setInput}
                  multiline
                  maxLength={COMPUBOT_MAX_CHARS}
                  accessibilityLabel="Message"
                />
                <Text style={[{ fontSize: 11, color: theme.textTertiary, marginTop: 4, marginLeft: 4 }, font(theme, 'body')]} accessibilityLiveRegion="polite">
                  {input.length}/{COMPUBOT_MAX_CHARS}
                  {input.length >= COMPUBOT_MAX_CHARS ? ' · This message stops at 500 characters' : ''}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.sendBtn, {
                  backgroundColor: theme.primary,
                  borderRadius: theme.radiusButton,
                  opacity: ((!input.trim() && !selectedImage) || loading) ? 0.45 : pressed ? 0.92 : 1,
                }]}
                onPress={() => sendMessage(input, selectedImage?.base64)}
                disabled={(!input.trim() && !selectedImage) || loading}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                accessibilityState={{ disabled: (!input.trim() && !selectedImage) || loading }}
              >
                <Ionicons name="send" size={18} color={theme.surface} />
              </Pressable>
            </Glass>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, marginBottom: 8 },
  emptyState: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 8, paddingTop: 24, paddingBottom: 16 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  quickChip: { minHeight: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center', maxWidth: 400 },
  messageList: { paddingTop: 8, paddingBottom: 8, gap: 12 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10 },
  msgImage: { width: 200, height: 150, borderRadius: 12, marginBottom: 6 },
  msgMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  speakBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 8 },
  imagePreviewBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  imagePreview: { width: 48, height: 48, borderRadius: 8 },
  removeImageBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 8, gap: 6 },
  inputColumn: { flex: 1 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, minHeight: 48, maxHeight: 120, width: '100%' },
  sendBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
