import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../lib/theme';

type ScaleRowProps = {
  label: string;
  low?: string;
  high?: string;
  value: number | null;
  onChange: (value: number) => void;
  max?: number; // inclusive, default 10
};

// A 0–N tappable scale. Eleven cells across a phone screen is tight, so
// cells flex and show only the number; the low/high anchors sit beneath.
export function ScaleRow({ label, low, high, value, onChange, max = 10 }: ScaleRowProps) {
  const { colors, spacing, radii, typography } = useTheme();
  const cells = Array.from({ length: max + 1 }, (_, i) => i);
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{label}</Text>
        <Text style={[typography.caption, { color: value === null ? colors.textFaint : colors.primary }]}>
          {value === null ? '—' : value}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {cells.map((n) => {
          const active = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${n}`}
              style={{
                flex: 1,
                height: 32,
                borderRadius: radii.sm,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primaryMuted : colors.surface,
              }}
            >
              <Text style={{ fontSize: 11, color: active ? colors.text : colors.textMuted, fontWeight: active ? '700' : '400' }}>
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {low || high ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 10, color: colors.textFaint }}>{low ?? ''}</Text>
          <Text style={{ fontSize: 10, color: colors.textFaint }}>{high ?? ''}</Text>
        </View>
      ) : null}
    </View>
  );
}
