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
import { HUD_COLORS, HUD_FONT, HUD_RADIUS } from '../../constants/hud';
import { ScratchMascot } from './ScratchMascot';
import { useScratchMessages, useSendToScratch } from '../../lib/hooks/useScratch';

type ChatMessage = {
  id: string;
  role: 'user' | 'scratch';
  text: string;
  variant?: 'setup' | 'error' | 'typing';
  created_at: string;
};

const HELLO: ChatMessage = {
  id: 'hello',
  role: 'scratch',
  text: "What's the play? Ask me anything — habits, streaks, the whole card.",
  created_at: '',
};

export function ChatSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { data: history = [] } = useScratchMessages();
  const send = useSendToScratch();
  const [exchange, setExchange] = useState<
    { text: string; reply?: string; actions?: string[]; baseline: string } | null
  >(null);
  const [chipAnchor, setChipAnchor] = useState<{ reply: string; actions: string[]; baseline: string } | null>(null);
  const [lastError, setLastError] = useState<'not_configured' | 'failed' | null>(null);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Once the history refetch lands with the reply we already showed optimistically
  // (and it's a fresh row, not some older row that happens to repeat the same text),
  // drop the in-flight exchange so the server-backed rows take over.
  useEffect(() => {
    if (!exchange?.reply) return;
    const covered = history.some(
      (row) => row.role !== 'user' && row.content === exchange.reply && row.created_at > exchange.baseline
    );
    if (covered) setExchange(null);
  }, [history, exchange]);

  const messages = useMemo<ChatMessage[]>(() => {
    const base: ChatMessage[] =
      history.length > 0
        ? history.map((row) => ({
            id: row.id,
            role: row.role === 'user' ? 'user' : 'scratch',
            text: row.content,
            created_at: row.created_at,
          }))
        : [HELLO];
    const out = [...base];
    if (exchange) {
      out.push({ id: 'pending-user', role: 'user', text: exchange.text, created_at: '' });
      if (exchange.reply) {
        out.push({ id: 'pending-reply', role: 'scratch', text: exchange.reply, created_at: '' });
      } else {
        out.push({
          id: 'pending-typing',
          role: 'scratch',
          text: 'scratch is reading the green…',
          variant: 'typing',
          created_at: '',
        });
      }
    } else if (lastError === 'not_configured') {
      out.push({
        id: 'error-not-configured',
        role: 'scratch',
        text:
          "My brain isn't hooked up yet. Add your Anthropic API key to Supabase (see DEPLOY-SCRATCH.md in the project) and I'm ready to caddie.",
        variant: 'setup',
        created_at: '',
      });
    } else if (lastError === 'failed') {
      out.push({
        id: 'error-failed',
        role: 'scratch',
        text: 'Shanked that one — give it another swing.',
        variant: 'error',
        created_at: '',
      });
    }
    return out;
  }, [history, exchange, lastError]);

  const onSend = () => {
    const text = draft.trim();
    if (!text || send.isPending) return;
    setDraft('');
    setLastError(null);
    setChipAnchor(null);
    const baseline = history[history.length - 1]?.created_at ?? '';
    setExchange({ text, baseline });
    send.mutate(text, {
      onSuccess: (result) => {
        if ('error' in result) {
          setExchange(null);
          setLastError(result.error === 'not_configured' ? 'not_configured' : 'failed');
        } else {
          setExchange((prev) => (prev ? { ...prev, reply: result.reply, actions: result.actions } : prev));
          if (result.actions.length > 0) {
            setChipAnchor({ reply: result.reply, actions: result.actions, baseline });
          }
        }
      },
      onError: () => {
        setExchange(null);
        setChipAnchor(null);
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
              backgroundColor: HUD_COLORS.bg,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              borderTopWidth: 0.75,
              borderLeftWidth: 0.75,
              borderRightWidth: 0.75,
              borderColor: HUD_COLORS.lineBright,
              maxHeight: 560,
              paddingBottom: insets.bottom + 8,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                padding: 12,
                borderBottomWidth: 0.75,
                borderBottomColor: HUD_COLORS.line,
              }}
            >
              <ScratchMascot size={40} />
              <Text style={{ fontFamily: HUD_FONT, fontSize: 14, color: HUD_COLORS.text, flex: 1 }}>
                agent scratch
              </Text>
              <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={HUD_COLORS.mintSoft} />
              </Pressable>
            </View>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              style={{ maxHeight: 380 }}
              contentContainerStyle={{ padding: 12, gap: 8 }}
              renderItem={({ item, index }) => {
                const isNewestScratchBubble =
                  item.role === 'scratch' && !item.variant && index === messages.length - 1;
                const chipsForBubble =
                  item.id === 'pending-reply'
                    ? exchange?.actions && exchange.actions.length > 0
                      ? exchange.actions
                      : null
                    : isNewestScratchBubble &&
                        chipAnchor &&
                        item.text === chipAnchor.reply &&
                        item.created_at > chipAnchor.baseline
                      ? chipAnchor.actions
                      : null;
                const isUser = item.role === 'user';
                return (
                  <View>
                    <View
                      style={{
                        alignSelf: isUser ? 'flex-end' : 'flex-start',
                        maxWidth: '82%',
                        backgroundColor: isUser ? HUD_COLORS.panelDeep : 'transparent',
                        borderRadius: HUD_RADIUS + 2,
                        borderWidth: 0.75,
                        borderColor: isUser ? HUD_COLORS.lineBright : HUD_COLORS.line,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                      }}
                    >
                      <Text style={{ fontFamily: HUD_FONT, fontSize: 13, lineHeight: 20, color: HUD_COLORS.text }}>
                        {item.text}
                      </Text>
                    </View>
                    {chipsForBubble && (
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: 4,
                          marginTop: 4,
                          alignSelf: 'flex-start',
                        }}
                      >
                        {chipsForBubble.map((action) => (
                          <View
                            key={action}
                            style={{
                              backgroundColor: HUD_COLORS.panel,
                              borderWidth: 0.75,
                              borderColor: HUD_COLORS.line,
                              borderRadius: HUD_RADIUS,
                              paddingVertical: 4,
                              paddingHorizontal: 8,
                            }}
                          >
                            <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.mint }}>
                              {`✓ ${action}`}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              }}
            />
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={onSend}
                placeholder="transmit to scratch…"
                placeholderTextColor={HUD_COLORS.mintSoft}
                returnKeyType="send"
                style={{
                  flex: 1,
                  fontFamily: HUD_FONT,
                  fontSize: 13,
                  color: HUD_COLORS.text,
                  backgroundColor: HUD_COLORS.panel,
                  borderRadius: HUD_RADIUS + 2,
                  borderWidth: 0.75,
                  borderColor: HUD_COLORS.line,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              />
              <Pressable
                onPress={onSend}
                accessibilityRole="button"
                accessibilityLabel="Send"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: HUD_RADIUS + 2,
                  backgroundColor: HUD_COLORS.panelDeep,
                  borderWidth: 0.75,
                  borderColor: HUD_COLORS.lineBright,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="arrow-up" size={20} color={HUD_COLORS.mint} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
