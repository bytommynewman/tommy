import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ContentHeader } from '../../../components/content/ContentHeader';
import { GlowBox } from '../../../components/hud/GlowBox';
import { SkeletonCard } from '../../../components/hud/SkeletonCard';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD, HUD_RADIUS } from '../../../constants/hud';
import { useDeleteIdea, useGenerateIdeas, useIdeas, useSetIdeaStatus } from '../../../lib/hooks/useContent';
import type { ReelIdea, ReelIdeaStatus } from '../../../types/database.types';

const NEXT_STATUS: Record<ReelIdeaStatus, ReelIdeaStatus> = {
  new: 'saved',
  saved: 'planned',
  planned: 'filmed',
  filmed: 'posted',
  posted: 'posted',
};
const SAVED_ORDER: ReelIdeaStatus[] = ['planned', 'filmed', 'saved', 'posted'];

function statusColor(status: ReelIdeaStatus): string {
  if (status === 'posted') return HUD_COLORS.mint;
  if (status === 'filmed' || status === 'planned') return HUD_COLORS.amber;
  return HUD_COLORS.mintSoft;
}

function IdeaCard({ idea }: { idea: ReelIdea }) {
  const setStatus = useSetIdeaStatus();
  const remove = useDeleteIdea();
  const isNew = idea.status === 'new';

  return (
    <GlowBox glow={isNew} style={{ padding: 12, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft }}>
          {idea.format.toLowerCase()}
        </Text>
        {!isNew ? (
          <Pressable
            onPress={() => setStatus.mutate({ id: idea.id, status: NEXT_STATUS[idea.status] })}
            accessibilityRole="button"
            accessibilityLabel={`Advance status, currently ${idea.status}`}
            style={{
              borderWidth: 0.75,
              borderColor: statusColor(idea.status),
              borderRadius: HUD_RADIUS,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: statusColor(idea.status) }}>
              {idea.status}
              {idea.status !== 'posted' ? ` → ${NEXT_STATUS[idea.status]}` : ' ✓'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 15, color: HUD_COLORS.text, marginTop: 6 }}>
        {idea.hook}
      </Text>
      <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.mintSoft, marginTop: 2 }}>
        {idea.title.toLowerCase()}
      </Text>
      <Text style={{ fontFamily: HUD_FONT, fontSize: 12, lineHeight: 19, color: HUD_COLORS.text, marginTop: 8 }}>
        {idea.outline}
      </Text>
      {isNew ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Pressable
            onPress={() => setStatus.mutate({ id: idea.id, status: 'saved' })}
            accessibilityRole="button"
            accessibilityLabel="Save idea"
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 8,
              backgroundColor: HUD_COLORS.panelDeep,
              borderWidth: 0.75,
              borderColor: HUD_COLORS.lineBright,
              borderRadius: HUD_RADIUS,
            }}
          >
            <Text style={{ fontFamily: HUD_FONT, fontSize: 12, color: HUD_COLORS.mint }}>save</Text>
          </Pressable>
          <Pressable
            onPress={() => remove.mutate(idea.id)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss idea"
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 8,
              borderWidth: 0.75,
              borderColor: HUD_COLORS.line,
              borderRadius: HUD_RADIUS,
            }}
          >
            <Text style={{ fontFamily: HUD_FONT, fontSize: 12, color: HUD_COLORS.mintSoft }}>dismiss</Text>
          </Pressable>
        </View>
      ) : null}
    </GlowBox>
  );
}

export default function IdeasScreen() {
  const { data: ideas = [], isLoading, isRefetching, refetch } = useIdeas();
  const generate = useGenerateIdeas();
  const [lastError, setLastError] = useState(false);

  const fresh = ideas.filter((i) => i.status === 'new');
  const kept = SAVED_ORDER.flatMap((s) => ideas.filter((i) => i.status === s));

  const onGenerate = () => {
    if (generate.isPending) return;
    setLastError(false);
    generate.mutate(undefined, {
      onSuccess: (result) => {
        if ('error' in result) setLastError(true);
      },
      onError: () => setLastError(true),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: HUD_COLORS.bg }}>
      <ContentHeader active="ideas" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={HUD_COLORS.mint} />}
      >
        <Pressable
          onPress={onGenerate}
          accessibilityRole="button"
          accessibilityLabel="Generate reel ideas"
          style={{
            backgroundColor: HUD_COLORS.panel,
            borderWidth: 0.75,
            borderColor: HUD_COLORS.lineBright,
            borderRadius: HUD_RADIUS,
            paddingVertical: 12,
            paddingHorizontal: 12,
            marginBottom: 14,
          }}
        >
          <Text style={{ fontFamily: HUD_FONT, fontSize: 12, color: HUD_COLORS.mint }}>
            {generate.isPending ? 'scratch is scouting angles…' : '> radio scratch for ideas_'}
          </Text>
        </Pressable>
        {lastError ? (
          <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.amber, marginBottom: 12 }}>
            shanked that one — run it again.
          </Text>
        ) : null}
        {isLoading ? (
          <>
            <SkeletonCard lines={4} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </>
        ) : null}
        {fresh.length > 0 ? (
          <>
            <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.line, marginBottom: 8 }}>
              {'// fresh from scratch'}
            </Text>
            {fresh.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </>
        ) : null}
        {kept.length > 0 ? (
          <>
            <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.line, marginVertical: 8 }}>
              {'// your board — tap a status to advance it'}
            </Text>
            {kept.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </>
        ) : null}
        {!isLoading && fresh.length === 0 && kept.length === 0 && !generate.isPending ? (
          <Text style={{ fontFamily: HUD_FONT, fontSize: 12, lineHeight: 20, color: HUD_COLORS.mintSoft }}>
            no ideas on the board yet. radio scratch — he knows your niche, your
            streaks, and what you filmed already.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
