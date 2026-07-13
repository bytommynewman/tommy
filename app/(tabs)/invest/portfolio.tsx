import React from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlowBox } from '../../../components/hud/GlowBox';
import {
  HUD_COLORS,
  HUD_FONT,
  HUD_FONT_BOLD,
  HUD_RADIUS,
  MONEY_COLORS,
  MONEY_SERIF,
} from '../../../constants/hud';
import { useConnectPortfolio, usePortfolio, usePortfolioStatus } from '../../../lib/hooks/usePortfolio';

// "$585.52" / "-$0.10" — Wealthsimple's dollars-first format.
function money(n: number): string {
  const abs = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  return `${n < 0 ? '-' : ''}$${abs}`;
}

// "+$12.58 (+3.21%)" — null when the day change couldn't be priced.
function changeLine(amount: number | null | undefined, pct: number | null | undefined): string | null {
  if (typeof amount !== 'number' || typeof pct !== 'number') return null;
  const sign = amount >= 0 ? '+' : '';
  return `${sign}${money(amount)} (${sign}${pct.toFixed(2)}%)`;
}

function shares(units: number): string {
  const n = Number.isInteger(units) ? String(units) : units.toFixed(4);
  return `${n} ${units === 1 ? 'share' : 'shares'}`;
}

function SectionHead({ label }: { label: string }) {
  return (
    <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.line, marginTop: 16, marginBottom: 8 }}>
      {label.toUpperCase()}
    </Text>
  );
}

export default function PortfolioScreen() {
  const status = usePortfolioStatus();
  const connected = !!status.data?.connected;
  const portfolio = usePortfolio(connected);
  const connect = useConnectPortfolio();

  const onConnect = () => {
    if (connect.isPending) return;
    connect.mutate(undefined, {
      onSuccess: (redirectURI) => {
        Linking.openURL(redirectURI).catch(() => {});
      },
    });
  };

  const refreshing = status.isRefetching || portfolio.isRefetching;
  const onRefresh = () => {
    status.refetch();
    if (connected) portfolio.refetch();
  };

  return (
    <View style={{ flex: 1, backgroundColor: HUD_COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD_COLORS.mint} />}
      >
        {!connected && !status.isLoading ? (
          <GlowBox glow style={{ padding: 20, alignItems: 'center' }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: HUD_RADIUS,
                borderWidth: 0.75,
                borderColor: HUD_COLORS.lineBright,
                backgroundColor: HUD_COLORS.panelDeep,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Ionicons name="link-outline" size={26} color={HUD_COLORS.mint} />
            </View>
            <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 14, color: HUD_COLORS.text }}>
              connect wealthsimple
            </Text>
            <Text
              style={{
                fontFamily: HUD_FONT,
                fontSize: 11,
                lineHeight: 19,
                color: HUD_COLORS.mintSoft,
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              opens snaptrade in safari — log in there and connect wealthsimple
              (look for connections). your password never touches this app.
              then come back here and pull down to load holdings.
            </Text>
            <Pressable
              onPress={onConnect}
              accessibilityRole="button"
              accessibilityLabel="Connect Wealthsimple"
              style={{
                marginTop: 14,
                alignSelf: 'stretch',
                alignItems: 'center',
                paddingVertical: 10,
                backgroundColor: HUD_COLORS.panelDeep,
                borderWidth: 0.75,
                borderColor: HUD_COLORS.lineBright,
                borderRadius: HUD_RADIUS,
              }}
            >
              <Text style={{ fontFamily: HUD_FONT, fontSize: 12, color: HUD_COLORS.mint }}>
                {connect.isPending ? 'opening secure link…' : '> connect account_'}
              </Text>
            </Pressable>
            {connect.isError ? (
              <Text style={{ fontFamily: HUD_FONT, fontSize: 10, lineHeight: 16, color: HUD_COLORS.amber, marginTop: 8 }}>
                {`connection failed: ${connect.error instanceof Error ? connect.error.message : 'unknown'} — screenshot this for claude`}
              </Text>
            ) : null}
          </GlowBox>
        ) : null}

        {connected && portfolio.data ? (
          <>
            <GlowBox glow style={{ padding: 4, marginBottom: 4 }}>
              {/* Double brass rule — the old-money engraving inside the HUD frame */}
              <View
                style={{
                  borderWidth: 0.75,
                  borderColor: MONEY_COLORS.brass,
                  borderRadius: HUD_RADIUS,
                  paddingVertical: 22,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: MONEY_SERIF,
                    fontSize: 12,
                    color: MONEY_COLORS.brass,
                    letterSpacing: 3,
                  }}
                >
                  PORTFOLIO
                </Text>
                {(portfolio.data.totals ?? []).map((t, i) => {
                  const change = changeLine(t.dayChange, t.dayChangePct);
                  const up = (t.dayChange ?? 0) >= 0;
                  return (
                    <View key={t.currency} style={{ alignItems: 'center' }}>
                      <Text
                        style={{
                          fontFamily: MONEY_SERIF,
                          fontSize: i === 0 ? 42 : 17,
                          color: MONEY_COLORS.cream,
                          marginTop: i === 0 ? 10 : 4,
                        }}
                      >
                        {money(t.value)}
                      </Text>
                      {change ? (
                        <Text
                          style={{
                            fontFamily: HUD_FONT,
                            fontSize: i === 0 ? 12 : 10,
                            color: up ? HUD_COLORS.mint : HUD_COLORS.amber,
                            marginTop: i === 0 ? 6 : 2,
                          }}
                        >
                          {`${change} past day`}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
                <View style={{ width: 56, height: 1, backgroundColor: MONEY_COLORS.brass, marginTop: 14, opacity: 0.7 }} />
                <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft, marginTop: 8 }}>
                  {`wealthsimple · synced ${new Date(portfolio.data.asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · live quotes`}
                </Text>
              </View>
            </GlowBox>

            <SectionHead label="accounts" />
            {portfolio.data.accounts.map((a) => {
              const change = changeLine(a.dayChange, a.dayChangePct);
              const up = (a.dayChange ?? 0) >= 0;
              return (
                <View
                  key={a.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderWidth: 0.75,
                    borderColor: HUD_COLORS.line,
                    borderRadius: HUD_RADIUS,
                    backgroundColor: HUD_COLORS.panel,
                    padding: 12,
                    marginBottom: 6,
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 12, color: HUD_COLORS.text }}>
                      {a.name.toLowerCase()}
                    </Text>
                    <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft, marginTop: 2 }}>
                      {a.institution.toLowerCase()}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: MONEY_SERIF, fontSize: 16, color: MONEY_COLORS.cream }}>
                      {money(a.value)}
                    </Text>
                    {change ? (
                      <Text
                        style={{
                          fontFamily: HUD_FONT,
                          fontSize: 10,
                          color: up ? HUD_COLORS.mint : HUD_COLORS.amber,
                          marginTop: 2,
                        }}
                      >
                        {`${(a.dayChangePct ?? 0) >= 0 ? '+' : ''}${(a.dayChangePct ?? 0).toFixed(2)}% past day`}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}

            {(portfolio.data.cash ?? []).length > 0 ? (
              <>
                <SectionHead label="available to trade" />
                {(portfolio.data.cash ?? []).map((c) => (
                  <View
                    key={c.currency}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderWidth: 0.75,
                      borderColor: HUD_COLORS.line,
                      borderRadius: HUD_RADIUS,
                      padding: 12,
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ fontFamily: HUD_FONT, fontSize: 12, color: HUD_COLORS.text }}>
                      {`${c.currency.toLowerCase()} cash`}
                    </Text>
                    <Text style={{ fontFamily: MONEY_SERIF, fontSize: 15, color: MONEY_COLORS.cream }}>
                      {money(c.amount)}
                    </Text>
                  </View>
                ))}
              </>
            ) : null}

            {portfolio.data.holdings.length > 0 ? <SectionHead label="holdings" /> : null}
            {portfolio.data.holdings.map((h, i) => {
              const change = changeLine(h.dayChange, h.dayChangePct);
              const up = (h.dayChange ?? 0) >= 0;
              return (
                <View
                  key={`${h.symbol}-${i}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 0.75,
                    borderColor: HUD_COLORS.line,
                    borderRadius: HUD_RADIUS,
                    backgroundColor: HUD_COLORS.panel,
                    padding: 12,
                    marginBottom: 6,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: HUD_RADIUS,
                      borderWidth: 0.75,
                      borderColor: HUD_COLORS.lineBright,
                      backgroundColor: HUD_COLORS.panelDeep,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                    }}
                  >
                    <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 9, color: HUD_COLORS.mint }} numberOfLines={1}>
                      {h.symbol.slice(0, 5)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 13, color: HUD_COLORS.text }}>
                      {h.symbol}
                    </Text>
                    <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft, marginTop: 2 }} numberOfLines={1}>
                      {shares(h.units)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: MONEY_SERIF, fontSize: 15, color: MONEY_COLORS.cream }}>
                      {`${money(h.value)}${h.currency ? ` ${h.currency}` : ''}`}
                    </Text>
                    {change ? (
                      <Text
                        style={{
                          fontFamily: HUD_FONT,
                          fontSize: 10,
                          color: up ? HUD_COLORS.mint : HUD_COLORS.amber,
                          marginTop: 2,
                        }}
                      >
                        {change}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </>
        ) : null}

        {connected && portfolio.isError ? (
          <GlowBox style={{ padding: 14, marginTop: 8 }}>
            <Text style={{ fontFamily: HUD_FONT, fontSize: 11, lineHeight: 19, color: HUD_COLORS.amber }}>
              couldn't pull holdings — if you just connected, give it a minute
              and pull down to refresh.
            </Text>
          </GlowBox>
        ) : null}
      </ScrollView>
    </View>
  );
}
