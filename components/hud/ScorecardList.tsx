import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HUD_COLORS, HUD_FONT, HUD_RADIUS } from '../../constants/hud';
import { STOPS } from '../../constants/hole';
import { useHabits, useRecentLogs, useRelapses } from '../../lib/hooks/useHabits';
import { recoveryStatus } from '../../lib/hudStats';
import { toneColor } from './StatChips';

// The five app sections as holes on a scorecard. Recovery shows live status;
// the rest are standby until their sections get real data layers.
export function ScorecardList() {
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useRecentLogs(1);
  const { data: relapses = [] } = useRelapses();
  const today = format(new Date(), 'yyyy-MM-dd');
  const recovery = recoveryStatus(habits, logs, relapses, today);

  return (
    <View>
      <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.line, marginBottom: 6 }}>
        {`// the course — ${STOPS.length} holes`}
      </Text>
      <View style={{ gap: 6 }}>
        {STOPS.map((stop, i) => {
          const status =
            stop.label === 'Recovery' ? recovery : ({ text: 'standby', tone: 'muted' } as const);
          const active = status.tone !== 'muted';
          return (
            <Pressable
              key={stop.label}
              onPress={() => router.push(stop.route)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${stop.label}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                borderWidth: 0.75,
                borderColor: HUD_COLORS.line,
                borderRadius: HUD_RADIUS,
                backgroundColor: active ? HUD_COLORS.panel : 'transparent',
                paddingVertical: 12,
                paddingHorizontal: 12,
              }}
            >
              <Ionicons name="flag-outline" size={15} color={active ? HUD_COLORS.mint : HUD_COLORS.mintSoft} />
              <Text style={{ fontFamily: HUD_FONT, fontSize: 13, color: HUD_COLORS.text, flex: 1 }}>
                {`${i + 1} · ${stop.label.toLowerCase()}`}
              </Text>
              <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: toneColor(status.tone) }}>
                {status.text}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
