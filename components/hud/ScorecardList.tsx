import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD, HUD_RADIUS } from '../../constants/hud';
import { STOPS } from '../../constants/hole';
import { useHabits, useRecentLogs, useRelapses } from '../../lib/hooks/useHabits';
import { recoveryStatus } from '../../lib/hudStats';
import { toneColor } from './StatChips';

// The five app sections as a little golf scorecard: hole-number boxes, ruled
// rows, a par column played by live status. Recovery reads real data; the
// rest are standby until their sections get data layers.
export function ScorecardList() {
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useRecentLogs(1);
  const { data: relapses = [] } = useRelapses();
  const today = format(new Date(), 'yyyy-MM-dd');
  const recovery = recoveryStatus(habits, logs, relapses, today);

  return (
    <View
      style={{
        borderWidth: 0.75,
        borderColor: HUD_COLORS.lineBright,
        borderRadius: HUD_RADIUS,
        backgroundColor: HUD_COLORS.panel,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderBottomWidth: 0.75,
          borderBottomColor: HUD_COLORS.line,
        }}
      >
        <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 12, color: HUD_COLORS.text }}>scorecard</Text>
        <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft }}>front 5 · your round</Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderBottomWidth: 0.75,
          borderBottomColor: HUD_COLORS.line,
        }}
      >
        <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.line, width: 40 }}>hole</Text>
        <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.line, flex: 1 }}>sector</Text>
        <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.line }}>score</Text>
      </View>
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
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderBottomWidth: i < STOPS.length - 1 ? 0.75 : 0,
              borderBottomColor: HUD_COLORS.line,
              backgroundColor: active ? HUD_COLORS.panelDeep : 'transparent',
            }}
          >
            <View style={{ width: 40 }}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderWidth: 0.75,
                  borderColor: active ? HUD_COLORS.mint : HUD_COLORS.line,
                  borderRadius: 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: HUD_FONT_BOLD,
                    fontSize: 11,
                    color: active ? HUD_COLORS.mint : HUD_COLORS.mintSoft,
                  }}
                >
                  {i + 1}
                </Text>
              </View>
            </View>
            <Text style={{ fontFamily: HUD_FONT, fontSize: 13, color: HUD_COLORS.text, flex: 1 }}>
              {stop.label.toLowerCase()}
            </Text>
            <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: toneColor(status.tone) }}>
              {status.text}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
