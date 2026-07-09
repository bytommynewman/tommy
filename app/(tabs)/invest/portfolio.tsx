import React from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlowBox } from '../../../components/hud/GlowBox';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD, HUD_RADIUS } from '../../../constants/hud';
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
              one-time secure login on snaptrade's page — your password never
              touches this app. after connecting, come back and pull down to
              load holdings.
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
              <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.amber, marginTop: 8 }}>
                couldn't open the link — is snaptrade-portfolio deployed? (NEXT-STEPS.md §7)
              </Text>
            ) : null}
          </GlowBox>
        ) : null}

        {connected && portfolio.data ? (
          <>
            <GlowBox glow style={{ padding: 16, alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft }}>
                total portfolio
              </Text>
              <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 28, color: HUD_COLORS.mint, marginTop: 4 }}>
                {money(portfolio.data.totalValue, portfolio.data.currency)}
              </Text>
              <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.line, marginTop: 4 }}>
                {`wealthsimple · synced ${new Date(portfolio.data.asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </Text>
            </GlowBox>
            {portfolio.data.accounts.map((a) => (
              <View
                key={a.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  borderWidth: 0.75,
                  borderColor: HUD_COLORS.line,
                  borderRadius: HUD_RADIUS,
                  padding: 10,
                  marginBottom: 6,
                }}
              >
                <Text style={{ fontFamily: HUD_FONT, fontSize: 12, color: HUD_COLORS.text }}>
                  {a.name.toLowerCase()}
                </Text>
                <Text style={{ fontFamily: HUD_FONT, fontSize: 12, color: HUD_COLORS.mintSoft }}>
                  {money(a.value, portfolio.data.currency)}
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
                    <Text style={{ fontFamily: HUD_FONT, fontSize: 12, color: HUD_COLORS.text }}>
                      {money(h.value, portfolio.data.currency)}
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
