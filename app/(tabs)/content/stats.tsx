import React, { useState } from 'react';
import { Image, Linking, Pressable, RefreshControl, ScrollView, Text, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polygon, Polyline } from 'react-native-svg';
import { ContentHeader } from '../../../components/content/ContentHeader';
import { GlowBox } from '../../../components/hud/GlowBox';
import { HoloCard } from '../../../components/hud/HoloCard';
import { SkeletonCard } from '../../../components/hud/SkeletonCard';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD, HUD_RADIUS, MONEY_COLORS, MONEY_SERIF } from '../../../constants/hud';
import { followerDelta, snapshotPoints } from '../../../lib/contentLogic';
import { useMediaStats, useSnapshots, useSyncInstagram } from '../../../lib/hooks/useContent';
import type { IgMediaStat } from '../../../types/database.types';

const SPARK_H = 48;

function n(x: number): string {
  return x.toLocaleString('en-US');
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 0.75,
        borderColor: HUD_COLORS.line,
        borderRadius: HUD_RADIUS,
        backgroundColor: HUD_COLORS.panel,
        paddingVertical: 9,
        paddingHorizontal: 2,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontFamily: MONEY_SERIF, fontSize: 15, color: MONEY_COLORS.cream }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={{ fontFamily: HUD_FONT, fontSize: 7.5, color: HUD_COLORS.mintSoft, marginTop: 3, letterSpacing: 0.8 }} numberOfLines={1}>
        {label.toUpperCase()}
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
        marginTop: 16,
        marginBottom: 8,
      }}
    >
      {label.toUpperCase()}
    </Text>
  );
}

// Static horizontal bars ranking reels by views — no animation on purpose.
function SignalBars({ media }: { media: IgMediaStat[] }) {
  const ranked = media.filter((m) => (m.plays ?? 0) > 0).slice(0, 8);
  if (ranked.length < 2) return null;
  const max = Math.max(...ranked.map((m) => m.plays ?? 0));
  return (
    <>
      <SectionHead label="signal by reel" />
      <GlowBox style={{ padding: 12 }}>
        {ranked.map((m, i) => {
          const pct = Math.max(((m.plays ?? 0) / max) * 100, 4);
          const posted = m.posted_at
            ? new Date(m.posted_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
            : '—';
          return (
            <View key={m.media_id} style={{ marginTop: i === 0 ? 0 : 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft }} numberOfLines={1}>
                  {`${posted} · ${(m.caption ?? 'untitled').split('\n')[0].slice(0, 34)}`}
                </Text>
                <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 9, color: HUD_COLORS.mint }}>
                  {n(m.plays ?? 0)}
                </Text>
              </View>
              <View style={{ height: 6, borderRadius: 2, backgroundColor: HUD_COLORS.panelDeep, overflow: 'hidden' }}>
                <View
                  style={{
                    width: `${pct}%`,
                    height: 6,
                    borderRadius: 2,
                    backgroundColor: pct === 100 ? HUD_COLORS.mint : HUD_COLORS.lineBright,
                  }}
                />
              </View>
            </View>
          );
        })}
      </GlowBox>
    </>
  );
}

function ReelRow({ media, rank }: { media: IgMediaStat; rank?: number }) {
  const caption = (media.caption ?? '').split('\n')[0] || 'untitled reel';
  const posted = media.posted_at
    ? new Date(media.posted_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
    : '—';
  const open = () => {
    if (media.permalink) Linking.openURL(media.permalink).catch(() => {});
  };
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`Open reel: ${caption}`}
      style={{
        borderWidth: 0.75,
        borderColor: HUD_COLORS.line,
        borderRadius: HUD_RADIUS,
        backgroundColor: HUD_COLORS.panel,
        padding: 12,
        marginBottom: 6,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {media.thumbnail_url ? (
          <Image
            source={{ uri: media.thumbnail_url }}
            style={{ width: 54, height: 72, borderRadius: HUD_RADIUS, backgroundColor: HUD_COLORS.panelDeep }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View
            style={{
              width: 54,
              height: 72,
              borderRadius: HUD_RADIUS,
              borderWidth: 0.75,
              borderColor: HUD_COLORS.line,
              backgroundColor: HUD_COLORS.panelDeep,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="film-outline" size={18} color={HUD_COLORS.line} />
          </View>
        )}
        <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 12, color: HUD_COLORS.text, flex: 1 }} numberOfLines={2}>
              {caption}
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft }}>{posted}</Text>
              {rank ? (
                <Text
                  style={{
                    fontFamily: HUD_FONT_BOLD,
                    fontSize: 9,
                    color: rank === 1 ? MONEY_COLORS.brass : HUD_COLORS.line,
                    letterSpacing: 1,
                    marginTop: 2,
                  }}
                >
                  {rank === 1 ? '▲ TOP SIGNAL' : `#${rank}`}
                </Text>
              ) : null}
            </View>
          </View>
          <View>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              {media.plays !== null ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="play-outline" size={11} color={HUD_COLORS.mint} />
                  <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 11, color: HUD_COLORS.mint }}>{n(media.plays)}</Text>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="heart-outline" size={11} color={HUD_COLORS.mintSoft} />
                <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.mintSoft }}>{n(media.likes)}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="chatbubble-outline" size={11} color={HUD_COLORS.mintSoft} />
                <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.mintSoft }}>{n(media.comments)}</Text>
              </View>
            </View>
            {typeof media.reach === 'number' || typeof media.saves === 'number' || typeof media.shares === 'number' ? (
              <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft, marginTop: 4 }}>
                {[
                  typeof media.reach === 'number' ? `reach ${n(media.reach)}` : null,
                  typeof media.saves === 'number' ? `saves ${n(media.saves)}` : null,
                  typeof media.shares === 'number' ? `shares ${n(media.shares)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function StatsScreen() {
  const snapshots = useSnapshots();
  const mediaStats = useMediaStats();
  const sync = useSyncInstagram();
  const [sparkWidth, setSparkWidth] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  const snaps = snapshots.data ?? [];
  const media = mediaStats.data ?? [];
  const latest = snaps[0] ?? null;
  const delta = followerDelta(snaps);
  const isLoading = snapshots.isLoading || mediaStats.isLoading;
  const connected = latest !== null;

  const totalLikes = media.reduce((sum, m) => sum + m.likes, 0);
  const totalComments = media.reduce((sum, m) => sum + m.comments, 0);
  const totalPlays = media.reduce((sum, m) => sum + (m.plays ?? 0), 0);
  const totalSaves = media.reduce((sum, m) => sum + (m.saves ?? 0), 0);
  const totalShares = media.reduce((sum, m) => sum + (m.shares ?? 0), 0);
  const playsCounted = media.filter((m) => (m.plays ?? 0) > 0).length;
  const avgViews = playsCounted > 0 ? Math.round(totalPlays / playsCounted) : 0;
  // Engagement: interactions per view across everything we can see.
  const engagement = totalPlays > 0 ? ((totalLikes + totalComments + totalSaves) / totalPlays) * 100 : null;
  const rankByViews = new Map(
    [...media]
      .filter((m) => (m.plays ?? 0) > 0)
      .sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0))
      .map((m, i) => [m.media_id, i + 1])
  );

  const onSync = () => {
    if (sync.isPending) return;
    setSyncError(null);
    sync.mutate(undefined, {
      onSuccess: (result) => {
        if ('error' in result) {
          setSyncError(
            result.error === 'not_configured'
              ? 'instagram isn’t hooked up yet — the one-time setup lives in CONNECT-INSTAGRAM.md (ask claude to walk you through it).'
              : `sync failed — screenshot this for claude.\nreason: ${result.detail ?? result.error}`
          );
        } else {
          snapshots.refetch();
          mediaStats.refetch();
        }
      },
      onError: () => setSyncError('sync failed — pull down to retry, or screenshot this for claude.'),
    });
  };

  const refreshing = snapshots.isRefetching || mediaStats.isRefetching;
  const onRefresh = () => {
    snapshots.refetch();
    mediaStats.refetch();
  };

  const points = snapshotPoints([...snaps].reverse(), Math.max(sparkWidth, 1), SPARK_H);
  const onSparkLayout = (e: LayoutChangeEvent) => setSparkWidth(e.nativeEvent.layout.width);

  return (
    <View style={{ flex: 1, backgroundColor: HUD_COLORS.bg }}>
      <ContentHeader active="stats" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD_COLORS.mint} />}
      >
        <HoloCard glow style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {latest?.profile_picture_url ? (
              <Image
                source={{ uri: latest.profile_picture_url }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: HUD_RADIUS,
                  borderWidth: 0.75,
                  borderColor: HUD_COLORS.lineBright,
                  backgroundColor: HUD_COLORS.panelDeep,
                }}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            ) : (
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
                }}
              >
                <Ionicons name="person-outline" size={18} color={HUD_COLORS.mint} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 16, color: HUD_COLORS.text, letterSpacing: 0.5 }}>
                {`@${latest?.username ?? 'bytommynewman'}`}
              </Text>
              <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft, marginTop: 2 }}>
                instagram · creator intel
              </Text>
            </View>
            <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mint, letterSpacing: 1.5 }}>
              {connected ? '● LIVE' : '○ STANDBY'}
            </Text>
          </View>

          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ fontFamily: MONEY_SERIF, fontSize: 48, color: MONEY_COLORS.cream }}>
              {latest ? n(latest.followers) : '—'}
            </Text>
            <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 10, color: MONEY_COLORS.brass, letterSpacing: 3, marginTop: 4 }}>
              FOLLOWERS
            </Text>
            {delta !== null ? (
              <View
                style={{
                  marginTop: 8,
                  borderWidth: 0.75,
                  borderColor: delta >= 0 ? HUD_COLORS.mint : HUD_COLORS.amber,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  backgroundColor: HUD_COLORS.panelDeep,
                }}
              >
                <Text
                  style={{
                    fontFamily: HUD_FONT_BOLD,
                    fontSize: 10,
                    color: delta >= 0 ? HUD_COLORS.mint : HUD_COLORS.amber,
                  }}
                >
                  {`${delta >= 0 ? '+' : ''}${n(delta)} since last sync`}
                </Text>
              </View>
            ) : null}
          </View>

          {snaps.length > 1 ? (
            <View onLayout={onSparkLayout} style={{ height: SPARK_H }}>
              {sparkWidth > 0 ? (
                <Svg width={sparkWidth} height={SPARK_H}>
                  <Polygon
                    points={`0,${SPARK_H} ${points} ${sparkWidth},${SPARK_H}`}
                    fill={HUD_COLORS.mint}
                    opacity={0.12}
                  />
                  <Polyline points={points} fill="none" stroke={HUD_COLORS.mint} strokeWidth={1.5} />
                </Svg>
              ) : null}
            </View>
          ) : null}

          <Pressable
            onPress={onSync}
            accessibilityRole="button"
            accessibilityLabel="Sync from Instagram"
            style={{
              marginTop: 10,
              alignItems: 'center',
              paddingVertical: 11,
              backgroundColor: HUD_COLORS.panelDeep,
              borderWidth: 0.75,
              borderColor: HUD_COLORS.lineBright,
              borderRadius: HUD_RADIUS,
            }}
          >
            <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 12, color: HUD_COLORS.mint, letterSpacing: 1 }}>
              {sync.isPending ? 'PULLING THE NUMBERS…' : '> SYNC FROM INSTAGRAM_'}
            </Text>
          </Pressable>
          {syncError ? (
            <Text style={{ fontFamily: HUD_FONT, fontSize: 10, lineHeight: 16, color: HUD_COLORS.amber, marginTop: 8 }}>
              {syncError}
            </Text>
          ) : null}
        </HoloCard>

        {isLoading ? <SkeletonCard lines={3} /> : null}

        {connected && typeof latest.views_28d === 'number' ? (
          <>
            <SectionHead label="reach report · last 28 days" />
            <HoloCard glow style={{ padding: 16 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: MONEY_SERIF, fontSize: 36, color: MONEY_COLORS.cream }}>
                  {n(latest.views_28d)}
                </Text>
                <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 9, color: MONEY_COLORS.brass, letterSpacing: 2.5, marginTop: 3 }}>
                  TOTAL VIEWS
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <StatChip
                  label="accounts reached"
                  value={typeof latest.reach_28d === 'number' ? n(latest.reach_28d) : '—'}
                />
                <StatChip
                  label="accounts engaged"
                  value={typeof latest.engaged_28d === 'number' ? n(latest.engaged_28d) : '—'}
                />
              </View>
              <Text style={{ fontFamily: HUD_FONT, fontSize: 8, lineHeight: 13, color: HUD_COLORS.line, marginTop: 8 }}>
                whole-account totals straight from instagram — same math as your
                professional dashboard, includes facebook crosspost + boosted views
              </Text>
            </HoloCard>
          </>
        ) : null}

        {connected ? (
          <>
            <SectionHead label="account telemetry" />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <StatChip label="posts" value={n(latest.media_count)} />
              <StatChip label="following" value={n(latest.following)} />
              <StatChip label="avg views" value={avgViews > 0 ? n(avgViews) : '—'} />
              <StatChip label="engaged" value={engagement !== null ? `${engagement.toFixed(1)}%` : '—'} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              <StatChip label="views" value={totalPlays > 0 ? n(totalPlays) : '—'} />
              <StatChip label="likes" value={n(totalLikes)} />
              <StatChip label="comments" value={n(totalComments)} />
              <StatChip label="saves" value={totalSaves > 0 ? n(totalSaves) : '—'} />
              <StatChip label="shares" value={totalShares > 0 ? n(totalShares) : '—'} />
            </View>
            <Text style={{ fontFamily: HUD_FONT, fontSize: 8, lineHeight: 13, color: HUD_COLORS.line, marginBottom: 4 }}>
              totals across your last {media.length} posts · instagram-side views only — facebook
              crosspost views and collab posts aren't exposed by instagram's api
            </Text>
            <SignalBars media={media} />
          </>
        ) : null}

        {media.length > 0 ? (
          <>
            <SectionHead label="recent transmissions · tap to open" />
            {media.map((m) => (
              <ReelRow key={m.media_id} media={m} rank={rankByViews.get(m.media_id)} />
            ))}
          </>
        ) : null}

        {!isLoading && !connected ? (
          <GlowBox style={{ padding: 14 }}>
            <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 12, color: HUD_COLORS.text }}>
              hook up the account — one time only
            </Text>
            <Text style={{ fontFamily: HUD_FONT, fontSize: 11, lineHeight: 19, color: HUD_COLORS.mintSoft, marginTop: 6 }}>
              instagram makes you connect through their official door: a free
              meta developer app linked to @bytommynewman. the full walkthrough
              is in CONNECT-INSTAGRAM.md in the project — ask claude and he'll
              take you through it step by step. once the key is set, hit sync
              above and this page comes alive.
            </Text>
          </GlowBox>
        ) : null}
      </ScrollView>
    </View>
  );
}
