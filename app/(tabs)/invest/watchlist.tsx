import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { GlowBox } from '../../../components/hud/GlowBox';
import {
  HUD_COLORS,
  HUD_FONT,
  HUD_FONT_BOLD,
  MONEY_COLORS,
  MONEY_SERIF,
} from '../../../constants/hud';
import { useWatchlistQuotes } from '../../../lib/hooks/useMarket';

// Tommy's Wealthsimple three up top, then the volatile cheap-seats bench.
// `symbol` is the Yahoo ticker; `display` is what the card shows; `blurb` is
// the plain-english one-liner. All symbols verified live on Yahoo 2026-07-10
// (BITF didn't resolve and was dropped). BVCI trades on the CSE, so Yahoo
// wants the .CN suffix — .V returns nothing.
const WATCHLIST = [
  { symbol: 'BVCI.CN', display: 'BVCI', blurb: 'blockchain venture capital & crypto payments' },
  { symbol: 'CUPR', display: 'CUPR', blurb: 'wound-care biotech out of singapore' },
  { symbol: 'AIIO', display: 'AIIO', blurb: 'ai robotics & smart hardware' },
  { symbol: 'BBAI', display: 'BBAI', blurb: 'ai analytics for defense & logistics' },
  { symbol: 'PLUG', display: 'PLUG', blurb: 'hydrogen fuel cells for warehouses & trucking' },
  { symbol: 'SNDL', display: 'SNDL', blurb: 'cannabis + liquor retail across canada' },
  { symbol: 'HIVE', display: 'HIVE', blurb: 'bitcoin mining & ai data centers' },
  { symbol: 'DNN', display: 'DNN', blurb: 'uranium miner in saskatchewan' },
  { symbol: 'RIG', display: 'RIG', blurb: 'offshore oil & gas drilling rigs' },
];

const SYMBOLS = WATCHLIST.map((w) => w.symbol);

function money(n: number): string {
  return n.toLocaleString('en-US', {
    maximumFractionDigits: n >= 1000 ? 0 : n < 1 ? 3 : 2,
    minimumFractionDigits: n >= 1000 ? 0 : n < 1 ? 3 : 2,
  });
}

// $ always; tack the code on for non-CAD so mixed currencies stay honest.
function priceLine(price: number, currency: string): string {
  return currency === 'CAD' ? `$${money(price)}` : `$${money(price)} ${currency.toLowerCase()}`;
}

function ChangePill({ changePct }: { changePct: number }) {
  const up = changePct >= 0;
  return (
    <View
      style={{
        backgroundColor: up ? HUD_COLORS.mint : HUD_COLORS.amber,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginTop: 8,
      }}
    >
      <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 11, color: HUD_COLORS.bg }}>
        {`${up ? '▲' : '▼'} ${up ? '+' : ''}${changePct.toFixed(2)}%`}
      </Text>
    </View>
  );
}

export default function WatchlistScreen() {
  const { data, isLoading, isError, isRefetching, refetch, dataUpdatedAt } =
    useWatchlistQuotes(SYMBOLS);

  const quoteFor = (symbol: string) => data?.quotes.find((q) => q.symbol === symbol);

  return (
    <View style={{ flex: 1, backgroundColor: HUD_COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={HUD_COLORS.mint} />}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <Text
            style={{
              fontFamily: HUD_FONT_BOLD,
              fontSize: 12,
              letterSpacing: 4,
              color: MONEY_COLORS.brass,
            }}
          >
            THE TAPE
          </Text>
          {data ? (
            <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft }}>
              {`live · ${new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </Text>
          ) : null}
        </View>

        {isLoading ? (
          <GlowBox style={{ padding: 16 }}>
            <Text style={{ fontFamily: HUD_FONT, fontSize: 12, color: HUD_COLORS.mintSoft }}>
              pulling the tape…
            </Text>
          </GlowBox>
        ) : null}
        {isError ? (
          <GlowBox style={{ padding: 16 }}>
            <Text style={{ fontFamily: HUD_FONT, fontSize: 12, lineHeight: 19, color: HUD_COLORS.amber }}>
              feed is down — is market-data deployed with the watchlist update? pull down to retry.
            </Text>
          </GlowBox>
        ) : null}

        {data
          ? WATCHLIST.map((w) => {
              const q = quoteFor(w.symbol);
              return (
                <GlowBox key={w.symbol} style={{ padding: 18, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text
                        style={{
                          fontFamily: HUD_FONT_BOLD,
                          fontSize: 22,
                          letterSpacing: 2,
                          color: HUD_COLORS.text,
                        }}
                      >
                        {w.display}
                      </Text>
                      <Text
                        numberOfLines={2}
                        style={{
                          fontFamily: HUD_FONT,
                          fontSize: 10,
                          lineHeight: 15,
                          color: HUD_COLORS.mintSoft,
                          marginTop: 6,
                        }}
                      >
                        {w.blurb}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {q ? (
                        <>
                          <Text style={{ fontFamily: MONEY_SERIF, fontSize: 24, color: MONEY_COLORS.cream }}>
                            {priceLine(q.price, q.currency)}
                          </Text>
                          <ChangePill changePct={q.changePct} />
                        </>
                      ) : (
                        <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.amber, marginTop: 6 }}>
                          no quote right now
                        </Text>
                      )}
                    </View>
                  </View>
                </GlowBox>
              );
            })
          : null}

        {data ? (
          <Text style={{ fontFamily: HUD_FONT, fontSize: 9, letterSpacing: 1, color: HUD_COLORS.mintSoft, marginTop: 10 }}>
            REFRESHES EVERY MINUTE WHILE OPEN · QUOTES DELAYED A FEW MINUTES
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
