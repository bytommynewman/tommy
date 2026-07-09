import React from 'react';
import { Text, View } from 'react-native';
import { format } from 'date-fns';
import { HUD_COLORS, HUD_FONT_BOLD, HUD_FONT, HUD_RADIUS } from '../../constants/hud';
import { useHabits, useRecentLogs, useRelapses } from '../../lib/hooks/useHabits';
import { bestDaysClean, formatVsPar, todaysCard, vsLastWeek, type HudTone } from '../../lib/hudStats';

export function toneColor(tone: HudTone): string {
  if (tone === 'good') return HUD_COLORS.mint;
  if (tone === 'warn') return HUD_COLORS.amber;
  return HUD_COLORS.mintSoft;
}

function Chip({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 0.75,
        borderColor: HUD_COLORS.line,
        borderRadius: HUD_RADIUS,
        paddingVertical: 8,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 18, color }}>{value}</Text>
      <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export function StatChips() {
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useRecentLogs(14);
  const { data: relapses = [] } = useRelapses();
  const today = format(new Date(), 'yyyy-MM-dd');

  const card = todaysCard(habits, logs, today);
  const clean = bestDaysClean(habits, relapses);
  const par = formatVsPar(vsLastWeek(logs, today));

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
      <Chip value={clean !== null ? String(clean) : '—'} label="days clean" color={HUD_COLORS.mint} />
      <Chip value={`${card.done}/${card.total}`} label="today's card" color={HUD_COLORS.mint} />
      <Chip value={par.text} label="vs. last week" color={toneColor(par.tone)} />
    </View>
  );
}
