import * as SecureStore from 'expo-secure-store';
import { format } from 'date-fns';
import { supabase } from '../supabase';
import type { ScratchMessage } from '../../types/database.types';

export type ScratchReply = { reply: string; actions: string[] };
export type ScratchFailure = { error: string };

export async function fetchScratchMessages(): Promise<ScratchMessage[]> {
  const { data, error } = await supabase
    .from('scratch_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []).reverse();
}

// Streaks and "today" are device-local concepts — send the device's date and
// timezone offset so the agent's numbers match what the app displays.
function localizedBody(extra: Record<string, unknown>): Record<string, unknown> {
  return {
    ...extra,
    today: format(new Date(), 'yyyy-MM-dd'),
    tz_offset_minutes: new Date().getTimezoneOffset(),
  };
}

export async function sendToScratch(text: string): Promise<ScratchReply | ScratchFailure> {
  const { data, error } = await supabase.functions.invoke('scratch-agent', {
    body: localizedBody({ mode: 'chat', text }),
  });
  if (error) return { error: 'agent_failed' };
  const record = data as Record<string, unknown>;
  if (!record || (typeof record.reply !== 'string' && typeof record.error !== 'string')) {
    return { error: 'agent_failed' };
  }
  return data as ScratchReply | ScratchFailure;
}

// Stored in expo-secure-store (iOS Keychain) rather than AsyncStorage: the daily
// read can reference recovery/habit specifics, so it shouldn't sit unencrypted
// on-device. The payload is a short string, well under SecureStore's ~2KB limit.
// SecureStore has no web implementation; there the catches below swallow the
// error and every load falls through to a fresh fetch.
const DAILY_READ_KEY = 'scratch.dailyRead'; // stores { day: 'YYYY-MM-DD', reply: string }

export async function fetchDailyRead(): Promise<{ reply: string } | null> {
  const today = format(new Date(), 'yyyy-MM-dd');
  try {
    const cached = await SecureStore.getItemAsync(DAILY_READ_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as { day: string; reply: string };
      if (parsed.day === today && parsed.reply) return { reply: parsed.reply };
    }
  } catch {
    // fall through to a fresh fetch
  }
  const { data, error } = await supabase.functions.invoke('scratch-agent', { body: localizedBody({ mode: 'brief' }) });
  if (error || !data || typeof data.reply !== 'string') return null;
  SecureStore.setItemAsync(DAILY_READ_KEY, JSON.stringify({ day: today, reply: data.reply })).catch(() => {});
  return { reply: data.reply };
}
