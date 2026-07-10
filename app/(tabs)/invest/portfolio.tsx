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

function money(n: number, currency: string): string {
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} ${currency}`;
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
            <GlowBox glow style={{ padding: 4, marginBottom: 12 }}>
              {/* Double brass rule — the old-money engraving inside the HUD frame */}
              <View
                style={{
                  borderWidth: 0.75,
                  borderColor: MONEY_COLORS.brass,
                  borderRadius: HUD_RADIUS,
                  paddingVertical: 18,
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
                {(portfolio.data.totals ?? []).map((t, i) => (
                  <Text
                    key={t.currency}
                    style={{
                      fontFamily: MONEY_SERIF,
                      fontSize: i === 0 ? 34 : 17,
                      color: MONEY_COLORS.cream,
                      marginTop: i === 0 ? 8 : 4,
                    }}
                  >
                    {`${money(t.value, t.currency)}`}
                  </Text>
                ))}
                <View style={{ width: 56, height: 1, backgroundColor: MONEY_COLORS.brass, marginTop: 12, opacity: 0.7 }} />
                <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft, marginTop: 8 }}>
                  {`wealthsimple · synced ${new Date(portfolio.data.asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · quotes can lag a few min`}
                </Text>
              </View>
            </GlowBox>
            {portfolio.data.accounts.map((a) => (
              <View
                key={a.id}
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
                  {a.name.toLowerCase()}
                </Text>
                <Text style={{ fontFamily: MONEY_SERIF, fontSize: 15, color: MONEY_COLORS.cream }}>
                  {money(a.value, a.currency)}
                </Text>
              </View>
            ))}
            {portfolio.data.holdings.length > 0 ? (
              <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.line, marginVertical: 8 }}>
                {'// holdings'}
              </Text>
            ) : null}
            {portfolio.data.holdings.map((h, i) => {
              const up = (h.openPnl ?? 0) >= 0;
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
                    padding: 10,
                    marginBottom: 6,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 13, color: HUD_COLORS.text }}>
                      {h.symbol}
                    </Text>
                    <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft }} numberOfLines={1}>
                      {`${h.units} × ${h.price.toFixed(2)}`}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: MONEY_SERIF, fontSize: 14, color: MONEY_COLORS.cream }}>
                      {h.value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                    </Text>
                    {h.openPnl !== null ? (
                      <Text
                        style={{
                          fontFamily: HUD_FONT,
                          fontSize: 10,
                          color: up ? HUD_COLORS.mint : HUD_COLORS.amber,
                        }}
                      >
                        {`${up ? '+' : ''}${h.openPnl.toFixed(2)}`}
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
