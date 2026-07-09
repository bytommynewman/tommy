import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { GlowBox } from '../../../components/hud/GlowBox';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD, HUD_RADIUS } from '../../../constants/hud';
import { useMarketOverview } from '../../../lib/hooks/useMarket';
import { snapshotPoints } from '../../../lib/contentLogic';
import type { MarketTracker } from '../../../lib/api/market';

const SPARK_W = 96;
const SPARK_H = 28;

function money(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: n >= 1000 ? 0 : 2 });
}

function TrackerCard({ t }: { t: MarketTracker }) {
  const up = t.changePct >= 0;
  const color = up ? HUD_COLORS.mint : HUD_COLORS.amber;
  const points = snapshotPoints(
    t.spark.map((v) => ({ followers: v, captured_at: '' })),
    SPARK_W,
    SPARK_H
  );
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 0.75,
        borderColor: HUD_COLORS.line,
        borderRadius: HUD_RADIUS,
        backgroundColor: HUD_COLORS.panel,
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginBottom: 8,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 13, color: HUD_COLORS.text }}>{t.label}</Text>
        <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 2 }}>
          {t.symbol.replace('^', '')}
        </Text>
      </View>
      {points ? (
        <Svg width={SPARK_W} height={SPARK_H}>
          <Polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
        </Svg>
      ) : null}
      <View style={{ alignItems: 'flex-end', minWidth: 88 }}>
        <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 14, color: HUD_COLORS.text }}>{money(t.price)}</Text>
        <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color, marginTop: 2 }}>
          {`${up ? '+' : ''}${t.changePct.toFixed(2)}%`}
        </Text>
      </View>
    </View>
  );
}

export default function MarketScreen() {
  const { data, isLoading, isError, isRefetching, refetch, dataUpdatedAt } = useMarketOverview();

  return (
    <View style={{ flex: 1, backgroundColor: HUD_COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={HUD_COLORS.mint} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.line }}>
            {'// market overview — the five majors, one feed'}
          </Text>
          {data ? (
            <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft }}>
              {`live · ${new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </Text>
          ) : null}
        </View>
        {isLoading ? (
          <GlowBox style={{ padding: 14 }}>
            <Text style={{ fontFamily: HUD_FONT, fontSize: 12, color: HUD_COLORS.mintSoft }}>
              pulling the tape…
            </Text>
          </GlowBox>
        ) : null}
        {isError ? (
          <GlowBox style={{ padding: 14 }}>
            <Text style={{ fontFamily: HUD_FONT, fontSize: 12, lineHeight: 19, color: HUD_COLORS.amber }}>
              feed is down — likely the market-data function isn't deployed yet
              (NEXT-STEPS.md §6). pull down to retry.
            </Text>
          </GlowBox>
        ) : null}
        {data?.trackers.map((t) => (
          <TrackerCard key={t.symbol} t={t} />
        ))}
        {data ? (
          <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft, marginTop: 8 }}>
            refreshes every minute while open · index data delayed a few minutes
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
