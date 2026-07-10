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
import type { MarketStock, MarketTracker } from '../../../lib/api/market';
import { buildMarketNotes } from '../../../lib/marketNotes';

const CHART_H = 170;

function money(n: number): string {
  return `$${n.toLocaleString('en-US', {
    maximumFractionDigits: n >= 1000 ? 0 : 2,
    minimumFractionDigits: n >= 1000 ? 0 : 2,
  })}`;
}

function timeOf(unixSecs: number): string {
  return new Date(unixSecs * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Varsity-badge day-change pill — the one rounded element in the HUD, on
// purpose: it's the Malbon patch on the scorecard.
function ChangePill({ pct, size = 10 }: { pct: number; size?: number }) {
  const up = pct >= 0;
  const color = up ? HUD_COLORS.mint : HUD_COLORS.amber;
  return (
    <View
      style={{
        borderWidth: 0.75,
        borderColor: color,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: HUD_COLORS.panelDeep,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: size, color }}>
        {`${up ? '+' : ''}${pct.toFixed(2)}%`}
      </Text>
    </View>
  );
}

function SectionHead({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontFamily: HUD_FONT_BOLD,
        fontSize: 10,
        color: MONEY_COLORS.brass,
        letterSpacing: 2.5,
        marginTop: 20,
        marginBottom: 10,
      }}
    >
      {label.toUpperCase()}
    </Text>
  );
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
    <GlowBox glow style={{ padding: 16, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text
            style={{
              fontFamily: HUD_FONT_BOLD,
              fontSize: 17,
              color: HUD_COLORS.text,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            {tracker.label}
          </Text>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 3 }}>
            {`${tracker.symbol.replace('^', '')} · ${tracker.currency.toLowerCase()}`}
          </Text>
          <View style={{ marginTop: 8 }}>
            <ChangePill pct={tracker.changePct} size={11} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: MONEY_SERIF, fontSize: 32, color: MONEY_COLORS.cream }}>
            {money(shownPrice)}
          </Text>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 3 }}>
            {shown ? `at ${timeOf(shown.t)} · drag to scrub` : 'today · drag to scrub'}
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

// Big-board card: two-up grid, chunky name, serif price, badge pill.
function StockCard({ stock }: { stock: MarketStock }) {
  return (
    <View
      style={{
        width: '48.5%',
        borderWidth: 0.75,
        borderColor: HUD_COLORS.line,
        borderRadius: HUD_RADIUS,
        backgroundColor: HUD_COLORS.panel,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <Text
        style={{ fontFamily: HUD_FONT_BOLD, fontSize: 13, color: HUD_COLORS.text, letterSpacing: 0.5 }}
        numberOfLines={1}
      >
        {stock.label}
      </Text>
      <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft, marginTop: 2 }}>
        {stock.symbol.toLowerCase()}
      </Text>
      <Text style={{ fontFamily: MONEY_SERIF, fontSize: 19, color: MONEY_COLORS.cream, marginTop: 8 }}>
        {money(stock.price)}
      </Text>
      <View style={{ marginTop: 6 }}>
        <ChangePill pct={stock.changePct} />
      </View>
    </View>
  );
}

export default function MarketScreen() {
  const { data, isLoading, isError, isRefetching, refetch, dataUpdatedAt } = useMarketOverview();
  const [selected, setSelected] = useState<string | null>(null);

  const trackers = data?.trackers ?? [];
  const stocks = data?.stocks ?? [];
  const featured = trackers.find((t) => t.symbol === selected) ?? trackers[0];
  const notes = useMemo(() => buildMarketNotes(trackers, stocks), [trackers, stocks]);

  return (
    <View style={{ flex: 1, backgroundColor: HUD_COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={HUD_COLORS.mint} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 10, color: MONEY_COLORS.brass, letterSpacing: 2.5 }}>
            THE MAJORS
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

        {trackers.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {trackers.map((t) => {
              const active = t.symbol === featured?.symbol;
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
                    gap: 6,
                    borderWidth: 0.75,
                    borderColor: active ? HUD_COLORS.lineBright : HUD_COLORS.line,
                    borderRadius: 999,
                    backgroundColor: active ? HUD_COLORS.panelDeep : HUD_COLORS.panel,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: HUD_FONT_BOLD,
                      fontSize: 11,
                      color: active ? HUD_COLORS.mint : HUD_COLORS.text,
                    }}
                  >
                    {t.label}
                  </Text>
                  <Text
                    style={{
                      fontFamily: HUD_FONT,
                      fontSize: 10,
                      color: up ? HUD_COLORS.mint : HUD_COLORS.amber,
                    }}
                  >
                    {`${up ? '+' : ''}${t.changePct.toFixed(2)}%`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {stocks.length > 0 ? (
          <>
            <SectionHead label="the big board" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {stocks.map((s) => (
                <StockCard key={s.symbol} stock={s} />
              ))}
            </View>
          </>
        ) : null}

        {notes.length > 0 ? (
          <>
            <SectionHead label="caddie's read" />
            <GlowBox style={{ padding: 14 }}>
              {notes.map((n, i) => (
                <Text
                  key={n}
                  style={{
                    fontFamily: HUD_FONT,
                    fontSize: 11,
                    lineHeight: 18,
                    color: n.startsWith('read:') ? HUD_COLORS.mint : HUD_COLORS.mintSoft,
                    marginTop: i === 0 ? 0 : 6,
                  }}
                >
                  {`· ${n}`}
                </Text>
              ))}
            </GlowBox>
          </>
        ) : null}

        {data ? (
          <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft, marginTop: 12 }}>
            refreshes every minute while open · quotes delayed a few minutes
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
