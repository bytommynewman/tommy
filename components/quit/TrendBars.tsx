import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../lib/theme';

type TrendBarsProps = {
  label: string;
  // Oldest → newest. null renders as an empty slot so gaps stay visible.
  values: (number | null)[];
  max?: number;
  // 'up' = higher is better (mood), 'down' = lower is better (craving, anxiety)
  good?: 'up' | 'down';
};

// Tiny dependency-free bar chart for the last N check-ins. Colour reads the
// direction: the "good" end of the scale is primary, the bad end is accent.
export function TrendBars({ label, values, max = 10, good = 'up' }: TrendBarsProps) {
  const { colors, spacing, typography, radii } = useTheme();
  const latest = [...values].reverse().find((v) => v !== null) ?? null;
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{latest === null ? '—' : latest}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 36 }}>
        {values.map((v, i) => {
          if (v === null) {
            return <View key={i} style={{ flex: 1, height: 2, backgroundColor: colors.border, borderRadius: 1 }} />;
          }
          const ratio = Math.min(1, Math.max(0, v / max));
          const isGood = good === 'up' ? ratio >= 0.6 : ratio <= 0.4;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: Math.max(3, ratio * 36),
                borderRadius: radii.sm / 2,
                backgroundColor: isGood ? colors.primary : colors.accent,
                opacity: 0.55 + 0.45 * (i / Math.max(1, values.length - 1)),
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
