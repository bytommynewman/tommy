import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useScratchMessages, useSendToScratch } from '../../lib/hooks/useScratch';

type ChatMessage = {
  id: string;
  role: 'user' | 'scratch';
  text: string;
  variant?: 'setup' | 'error' | 'typing';
};

const HELLO: ChatMessage = {
  id: 'hello',
  role: 'scratch',
  text: "What's the play? Ask me anything — habits, streaks, the whole card.",
};

export function ChatSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, spacing, radii, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: history = [] } = useScratchMessages();
  const send = useSendToScratch();
  const [exchange, setExchange] = useState<{ text: string; reply?: string; actions?: string[] } | null>(null);
  const [lastError, setLastError] = useState<'not_configured' | 'failed' | null>(null);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const lastActions =
    send.data && 'actions' in send.data && send.data.actions.length > 0 ? send.data.actions : null;

  // Once the history refetch lands with the reply we already showed optimistically,
  // drop the in-flight exchange so the server-backed rows take over.
  useEffect(() => {
    if (!exchange?.reply) return;
    const covered = history.some((row) => row.role !== 'user' && row.content === exchange.reply);
    if (covered) setExchange(null);
  }, [history, exchange]);

  const messages = useMemo<ChatMessage[]>(() => {
    const base: ChatMessage[] =
      history.length > 0
        ? history.map((row) => ({
            id: row.id,
            role: row.role === 'user' ? 'user' : 'scratch',
            text: row.content,
          }))
        : [HELLO];
    const out = [...base];
    if (exchange) {
      out.push({ id: 'pending-user', role: 'user', text: exchange.text });
      if (exchange.reply) {
        out.push({ id: 'pending-reply', role: 'scratch', text: exchange.reply });
      } else {
        out.push({ id: 'pending-typing', role: 'scratch', text: 'Scratch is reading the green…', variant: 'typing' });
      }
    } else if (lastError === 'not_configured') {
      out.push({
        id: 'error-not-configured',
        role: 'scratch',
        text:
          "My brain isn't hooked up yet. Add your Anthropic API key to Supabase (see DEPLOY-SCRATCH.md in the project) and I'm ready to caddie.",
        variant: 'setup',
      });
    } else if (lastError === 'failed') {
      out.push({
        id: 'error-failed',
        role: 'scratch',
        text: 'Shanked that one — give it another swing.',
        variant: 'error',
      });
    }
    return out;
  }, [history, exchange, lastError]);

  const onSend = () => {
    const text = draft.trim();
    if (!text || send.isPending) return;
    setDraft('');
    setLastError(null);
    setExchange({ text });
    send.mutate(text, {
      onSuccess: (result) => {
        if ('error' in result) {
          setExchange(null);
          setLastError(result.error === 'not_configured' ? 'not_configured' : 'failed');
        } else {
          setExchange((prev) => (prev ? { ...prev, reply: result.reply, actions: result.actions } : prev));
        }
      },
      onError: () => {
        setExchange(null);
        setLastError('failed');
      },
    });
  };

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
              renderItem={({ item, index }) => {
                const isNewestScratchBubble =
                  item.role === 'scratch' && !item.variant && index === messages.length - 1;
                const chipsForBubble =
                  item.id === 'pending-reply'
                    ? exchange?.actions && exchange.actions.length > 0
                      ? exchange.actions
                      : null
                    : isNewestScratchBubble && lastActions && send.data && 'reply' in send.data && item.text === send.data.reply
                      ? lastActions
                      : null;
                return (
                  <View>
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
                    {chipsForBubble && (
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: spacing.xs,
                          marginTop: spacing.xs,
                          alignSelf: 'flex-start',
                        }}
                      >
                        {chipsForBubble.map((action) => (
                          <View
                            key={action}
                            style={{
                              backgroundColor: colors.primaryMuted,
                              borderRadius: radii.pill,
                              paddingVertical: spacing.xs,
                              paddingHorizontal: spacing.sm,
                            }}
                          >
                            <Text style={[typography.caption, { color: colors.primary }]}>{`✓ ${action}`}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              }}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={onSend}
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
                onPress={onSend}
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
