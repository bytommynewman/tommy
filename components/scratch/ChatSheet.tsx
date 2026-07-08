import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { ScratchMascot } from './ScratchMascot';

type ChatMessage = { id: string; role: 'user' | 'scratch'; text: string };

// Project A placeholder brain: canned replies. Project B replaces sendToScratch
// with the real edge-function agent; the UI contract stays identical.
const CANNED = [
  "Brain's not hooked up yet — once my API key is in, I can actually do that for you.",
  "Heard. I'll be able to handle that myself once my brain's connected — for now, hit the Sections page.",
  "Love the energy. Wire up my brain (Settings will walk you through it soon) and I'm on it.",
];

export function ChatSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, spacing, radii, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'hello', role: 'scratch', text: "What's the play? Ask me anything — habits, streaks, the whole card." },
  ]);
  const [draft, setDraft] = useState('');
  const cannedIndex = useRef(0);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    const reply = CANNED[cannedIndex.current % CANNED.length];
    cannedIndex.current += 1;
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: 'user', text }]);
    setTimeout(() => {
      setMessages((m) => [...m, { id: `s${Date.now()}`, role: 'scratch', text: reply }]);
    }, 450);
  }, [draft]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close chat" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: radii.lg,
              borderTopRightRadius: radii.lg,
              maxHeight: 560,
              paddingBottom: insets.bottom + spacing.sm,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <ScratchMascot size={40} />
              <Text style={[typography.heading, { color: colors.text, flex: 1 }]}>Scratch</Text>
              <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              style={{ maxHeight: 380 }}
              contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
              renderItem={({ item }) => (
                <View
                  style={{
                    alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '82%',
                    backgroundColor: item.role === 'user' ? colors.primary : colors.surface,
                    borderRadius: radii.md,
                    borderWidth: item.role === 'user' ? 0 : 1,
                    borderColor: colors.border,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                  }}
                >
                  <Text style={[typography.body, { color: item.role === 'user' ? colors.onPrimary : colors.text }]}>
                    {item.text}
                  </Text>
                </View>
              )}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={send}
                placeholder="Ask Scratch anything…"
                placeholderTextColor={colors.textFaint}
                returnKeyType="send"
                style={[
                  typography.body,
                  {
                    flex: 1,
                    color: colors.text,
                    backgroundColor: colors.surface,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                  },
                ]}
              />
              <Pressable
                onPress={send}
                accessibilityRole="button"
                accessibilityLabel="Send"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="arrow-up" size={20} color={colors.onPrimary} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
