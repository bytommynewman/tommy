import AsyncStorage from '@react-native-async-storage/async-storage';
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
  return data as ScratchReply | ScratchFailure;
}

const DAILY_READ_KEY = 'scratch.dailyRead'; // stores { day: 'YYYY-MM-DD', reply: string }

export async function fetchDailyRead(): Promise<{ reply: string } | null> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const cached = await AsyncStorage.getItem(DAILY_READ_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as { day: string; reply: string };
      if (parsed.day === today && parsed.reply) return { reply: parsed.reply };
    }
  } catch {
    // fall through to a fresh fetch
  }
  const { data, error } = await supabase.functions.invoke('scratch-agent', { body: localizedBody({ mode: 'brief' }) });
  if (error || !data || typeof data.reply !== 'string') return null;
  AsyncStorage.setItem(DAILY_READ_KEY, JSON.stringify({ day: today, reply: data.reply })).catch(() => {});
  return { reply: data.reply };
}
