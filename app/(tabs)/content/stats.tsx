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
        paddingVertical: 10,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontFamily: MONEY_SERIF, fontSize: 18, color: MONEY_COLORS.cream }}>{value}</Text>
      <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft, marginTop: 3, letterSpacing: 1 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function ReelRow({ media }: { media: IgMediaStat }) {
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
            <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft }}>{posted}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            {media.plays !== null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="play-outline" size={11} color={HUD_COLORS.mint} />
                <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.mint }}>{n(media.plays)}</Text>
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

        {connected ? (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <StatChip label="posts" value={n(latest.media_count)} />
              <StatChip label="following" value={n(latest.following)} />
              <StatChip label="likes" value={n(totalLikes)} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              <StatChip label="views" value={totalPlays > 0 ? n(totalPlays) : '—'} />
              <StatChip label="comments" value={n(totalComments)} />
            </View>
            <Text style={{ fontFamily: HUD_FONT, fontSize: 8, lineHeight: 13, color: HUD_COLORS.line, marginBottom: 8 }}>
              totals across your last {media.length} posts · instagram-side views only — facebook
              crosspost views and collab posts aren't exposed by instagram's api
            </Text>
          </>
        ) : null}

        {media.length > 0 ? (
          <>
            <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 10, color: MONEY_COLORS.brass, letterSpacing: 2.5, marginTop: 8, marginBottom: 8 }}>
              RECENT REELS · TAP TO OPEN
            </Text>
            {media.map((m) => (
              <ReelRow key={m.media_id} media={m} />
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
