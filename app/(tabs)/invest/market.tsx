import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Polygon, Polyline, Circle } from 'react-native-svg';
import { GlowBox } from '../../../components/hud/GlowBox';
import {
  HUD_COLORS,
  HUD_FONT,
  HUD_FONT_BOLD,
  HUD_RADIUS,
  MONEY_COLORS,
  MONEY_SERIF,
} from '../../../constants/hud';
import { useMarketOverview } from '../../../lib/hooks/useMarket';
import type { MarketTracker } from '../../../lib/api/market';

const CHART_H = 170;

function money(n: number): string {
  return n.toLocaleString('en-US', {
    maximumFractionDigits: n >= 1000 ? 0 : 2,
    minimumFractionDigits: n >= 1000 ? 0 : 2,
  });
}

function timeOf(unixSecs: number): string {
  return new Date(unixSecs * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Pixel geometry for the featured chart: x spread across the width,
// y min-max normalized with a little headroom so the line never kisses
// the card edges.
function chartGeometry(values: number[], width: number, height: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = height * 0.12;
  const usable = height - pad * 2;
  const xs = values.map((_, i) => (values.length === 1 ? width / 2 : (i / (values.length - 1)) * width));
  const ys = values.map((v) => height - pad - ((v - min) / span) * usable);
  return { xs, ys };
}

function FeaturedChart({ tracker }: { tracker: MarketTracker }) {
  const [width, setWidth] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const up = tracker.changePct >= 0;
  const color = up ? HUD_COLORS.mint : HUD_COLORS.amber;

  const values = tracker.series.map((p) => p.v);
  const geo = useMemo(
    () => (values.length > 1 && width > 0 ? chartGeometry(values, width, CHART_H) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracker.symbol, width, values.length]
  );

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const indexAt = (x: number) =>
    Math.max(0, Math.min(values.length - 1, Math.round((x / Math.max(width, 1)) * (values.length - 1))));

  const shown = scrub !== null && tracker.series[scrub] ? tracker.series[scrub] : null;
  const shownPrice = shown ? shown.v : tracker.price;

  return (
    <GlowBox glow style={{ padding: 14, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 15, color: HUD_COLORS.text }}>
            {tracker.label}
          </Text>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 2 }}>
            {`${tracker.symbol.replace('^', '')} · ${tracker.currency.toLowerCase()}`}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: MONEY_SERIF, fontSize: 26, color: MONEY_COLORS.cream }}>
            {money(shownPrice)}
          </Text>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: shown ? HUD_COLORS.mintSoft : color, marginTop: 2 }}>
            {shown
              ? `at ${timeOf(shown.t)} · drag to scrub`
              : `${up ? '+' : ''}${tracker.changePct.toFixed(2)}% today`}
          </Text>
        </View>
      </View>
      <View
        onLayout={onLayout}
        style={{ height: CHART_H, marginTop: 12 }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => setScrub(indexAt(e.nativeEvent.locationX))}
        onResponderMove={(e) => setScrub(indexAt(e.nativeEvent.locationX))}
        onResponderRelease={() => setScrub(null)}
        onResponderTerminate={() => setScrub(null)}
      >
        {geo ? (
          <Svg width={width} height={CHART_H}>
            <Polygon
              points={`0,${CHART_H} ${geo.xs.map((x, i) => `${x},${geo.ys[i]}`).join(' ')} ${width},${CHART_H}`}
              fill={color}
              opacity={0.12}
            />
            <Polyline
              points={geo.xs.map((x, i) => `${x},${geo.ys[i]}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={2}
            />
            {scrub !== null && geo.xs[scrub] !== undefined ? (
              <>
                <Line
                  x1={geo.xs[scrub]}
                  y1={0}
                  x2={geo.xs[scrub]}
                  y2={CHART_H}
                  stroke={HUD_COLORS.mintSoft}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <Circle cx={geo.xs[scrub]} cy={geo.ys[scrub]} r={5} fill={color} />
              </>
            ) : null}
          </Svg>
        ) : (
          <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.mintSoft }}>
            no intraday data right now
          </Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.line }}>
          {tracker.series.length > 0 ? timeOf(tracker.series[0].t) : ''}
        </Text>
        <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.line }}>
          {tracker.series.length > 0 ? timeOf(tracker.series[tracker.series.length - 1].t) : ''}
        </Text>
      </View>
    </GlowBox>
  );
}

export default function MarketScreen() {
  const { data, isLoading, isError, isRefetching, refetch, dataUpdatedAt } = useMarketOverview();
  const [selected, setSelected] = useState<string | null>(null);

  const trackers = data?.trackers ?? [];
  const featured = trackers.find((t) => t.symbol === selected) ?? trackers[0];

  return (
    <View style={{ flex: 1, backgroundColor: HUD_COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={HUD_COLORS.mint} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.line }}>
            {'// the five majors — tap one, drag the chart'}
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
              feed is down — is market-data deployed? (NEXT-STEPS.md §6). pull down to retry.
            </Text>
          </GlowBox>
        ) : null}

        {featured ? <FeaturedChart tracker={featured} /> : null}

        {trackers
          .filter((t) => t.symbol !== featured?.symbol)
          .map((t) => {
            const up = t.changePct >= 0;
            return (
              <Pressable
                key={t.symbol}
                onPress={() => setSelected(t.symbol)}
                accessibilityRole="button"
                accessibilityLabel={`Feature ${t.label}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
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
                  <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 13, color: HUD_COLORS.text }}>
                    {t.label}
                  </Text>
                  <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 2 }}>
                    {`${t.symbol.replace('^', '')} · ${t.currency.toLowerCase()}`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontFamily: MONEY_SERIF, fontSize: 16, color: MONEY_COLORS.cream }}>
                    {money(t.price)}
                  </Text>
                  <Text
                    style={{
                      fontFamily: HUD_FONT,
                      fontSize: 11,
                      color: up ? HUD_COLORS.mint : HUD_COLORS.amber,
                      marginTop: 2,
                    }}
                  >
                    {`${up ? '+' : ''}${t.changePct.toFixed(2)}%`}
                  </Text>
                </View>
              </Pressable>
            );
          })}

        {data ? (
          <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft, marginTop: 8 }}>
            refreshes every minute while open · index data delayed a few minutes
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
