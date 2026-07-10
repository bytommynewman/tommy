import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ContentHeader } from '../../../components/content/ContentHeader';
import { HoloCard } from '../../../components/hud/HoloCard';
import { SkeletonCard } from '../../../components/hud/SkeletonCard';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD, HUD_RADIUS, MONEY_COLORS } from '../../../constants/hud';
import { splitOutline } from '../../../lib/contentLogic';
import { useDeleteIdea, useGenerateIdeas, useIdeas, useSetIdeaStatus } from '../../../lib/hooks/useContent';
import type { ReelIdea, ReelIdeaStatus } from '../../../types/database.types';

const NEXT_STATUS: Record<ReelIdeaStatus, ReelIdeaStatus> = {
  new: 'saved',
  saved: 'planned',
  planned: 'filmed',
  filmed: 'posted',
  posted: 'posted',
};

type Filter = 'all' | ReelIdeaStatus;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'all' },
  { key: 'new', label: 'fresh' },
  { key: 'saved', label: 'saved' },
  { key: 'planned', label: 'planned' },
  { key: 'filmed', label: 'filmed' },
  { key: 'posted', label: 'posted' },
];

function statusColor(status: ReelIdeaStatus): string {
  if (status === 'posted') return HUD_COLORS.mint;
  if (status === 'filmed' || status === 'planned') return HUD_COLORS.amber;
  return HUD_COLORS.mintSoft;
}

const IdeaCard = React.memo(function IdeaCard({ idea }: { idea: ReelIdea }) {
  const setStatus = useSetIdeaStatus();
  const remove = useDeleteIdea();
  const isNew = idea.status === 'new';
  const { beats, example } = splitOutline(idea.outline);

  return (
    <HoloCard glow={isNew}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View
          style={{
            borderWidth: 0.75,
            borderColor: HUD_COLORS.lineBright,
            borderRadius: 999,
            paddingHorizontal: 9,
            paddingVertical: 3,
            backgroundColor: HUD_COLORS.panelDeep,
          }}
        >
          <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 9, color: HUD_COLORS.mint, letterSpacing: 1 }}>
            {idea.format.toUpperCase()}
          </Text>
        </View>
        {!isNew ? (
          <Pressable
            onPress={() => setStatus.mutate({ id: idea.id, status: NEXT_STATUS[idea.status] })}
            accessibilityRole="button"
            accessibilityLabel={`Advance status, currently ${idea.status}`}
            style={{
              borderWidth: 0.75,
              borderColor: statusColor(idea.status),
              borderRadius: 999,
              paddingHorizontal: 9,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: statusColor(idea.status) }}>
              {idea.status}
              {idea.status !== 'posted' ? ` → ${NEXT_STATUS[idea.status]}` : ' ✓'}
            </Text>
          </Pressable>
        ) : (
          <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mint, letterSpacing: 1.5 }}>
            ● INCOMING
          </Text>
        )}
      </View>

      <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 17, lineHeight: 24, color: HUD_COLORS.text, marginTop: 10 }}>
        {idea.hook}
      </Text>
      <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.mintSoft, marginTop: 3 }}>
        {idea.title.toLowerCase()}
      </Text>

      <View style={{ marginTop: 10 }}>
        {beats.map((beat, i) => (
          <View key={`${idea.id}-b-${i}`} style={{ flexDirection: 'row', gap: 8, paddingVertical: 3 }}>
            <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 10, color: HUD_COLORS.line, width: 20, marginTop: 2 }}>
              {String(i + 1).padStart(2, '0')}
            </Text>
            <Text style={{ fontFamily: HUD_FONT, fontSize: 12, lineHeight: 18, color: HUD_COLORS.text, flex: 1 }}>
              {beat}
            </Text>
          </View>
        ))}
      </View>

      {example ? (
        <View
          style={{
            marginTop: 10,
            borderLeftWidth: 2,
            borderLeftColor: MONEY_COLORS.brass,
            paddingLeft: 10,
            paddingVertical: 2,
          }}
        >
          <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: MONEY_COLORS.brass, letterSpacing: 1.5 }}>
            ▸ FILM IT LIKE
          </Text>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 11, lineHeight: 17, color: HUD_COLORS.mintSoft, marginTop: 2 }}>
            {example}
          </Text>
        </View>
      ) : null}

      {isNew ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Pressable
            onPress={() => setStatus.mutate({ id: idea.id, status: 'saved' })}
            accessibilityRole="button"
            accessibilityLabel="Save idea"
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 9,
              backgroundColor: HUD_COLORS.panelDeep,
              borderWidth: 0.75,
              borderColor: HUD_COLORS.lineBright,
              borderRadius: HUD_RADIUS,
            }}
          >
            <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 12, color: HUD_COLORS.mint }}>KEEP ▸</Text>
          </Pressable>
          <Pressable
            onPress={() => remove.mutate(idea.id)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss idea"
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 9,
              borderWidth: 0.75,
              borderColor: HUD_COLORS.line,
              borderRadius: HUD_RADIUS,
            }}
          >
            <Text style={{ fontFamily: HUD_FONT, fontSize: 12, color: HUD_COLORS.mintSoft }}>scrap</Text>
          </Pressable>
        </View>
      ) : null}
    </HoloCard>
  );
});

export default function IdeasScreen() {
  const { data: ideas = [], isLoading, isRefetching, refetch } = useIdeas();
  const generate = useGenerateIdeas();
  const [filter, setFilter] = useState<Filter>('all');
  const [lastError, setLastError] = useState(false);

  const shown = filter === 'all' ? ideas : ideas.filter((i) => i.status === filter);
  const countOf = (f: Filter) => (f === 'all' ? ideas.length : ideas.filter((i) => i.status === f).length);

  const onGenerate = () => {
    if (generate.isPending) return;
    setLastError(false);
    generate.mutate(undefined, {
      onSuccess: (result) => {
        if ('error' in result) setLastError(true);
        else setFilter('all');
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 10, color: MONEY_COLORS.brass, letterSpacing: 2.5 }}>
            IDEA ENGINE
          </Text>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mint }}>
            {generate.isPending ? '◉ GENERATING' : `● ONLINE · ${ideas.length} CONCEPTS`}
          </Text>
        </View>

        <Pressable
          onPress={onGenerate}
          accessibilityRole="button"
          accessibilityLabel="Generate reel ideas"
          style={{
            backgroundColor: HUD_COLORS.panelDeep,
            borderWidth: 0.75,
            borderColor: HUD_COLORS.lineBright,
            borderRadius: HUD_RADIUS,
            paddingVertical: 14,
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 13, color: HUD_COLORS.mint, letterSpacing: 1 }}>
            {generate.isPending ? 'SCRATCH IS SCOUTING ANGLES…' : '> RADIO SCRATCH FOR IDEAS_'}
          </Text>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft, marginTop: 3 }}>
            5 fresh concepts · tuned to your niche, habits and follower count
          </Text>
        </Pressable>

        {lastError ? (
          <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.amber, marginBottom: 12 }}>
            shanked that one — run it again.
          </Text>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingBottom: 12 }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count = countOf(f.key);
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                accessibilityRole="button"
                accessibilityLabel={`Filter ${f.label}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  borderWidth: 0.75,
                  borderColor: active ? HUD_COLORS.lineBright : HUD_COLORS.line,
                  borderRadius: 999,
                  backgroundColor: active ? HUD_COLORS.panelDeep : 'transparent',
                  paddingVertical: 6,
                  paddingHorizontal: 11,
                }}
              >
                <Text
                  style={{
                    fontFamily: HUD_FONT_BOLD,
                    fontSize: 11,
                    color: active ? HUD_COLORS.mint : HUD_COLORS.mintSoft,
                  }}
                >
                  {f.label}
                </Text>
                <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: active ? HUD_COLORS.mintSoft : HUD_COLORS.line }}>
                  {count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <>
            <SkeletonCard lines={4} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </>
        ) : null}

        {shown.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} />
        ))}

        {!isLoading && shown.length === 0 && !generate.isPending ? (
          <Text style={{ fontFamily: HUD_FONT, fontSize: 12, lineHeight: 20, color: HUD_COLORS.mintSoft }}>
            {filter === 'all'
              ? 'no ideas on the board yet. radio scratch — he knows your niche, your streaks, and what you filmed already.'
              : `nothing marked ${FILTERS.find((f) => f.key === filter)?.label} yet.`}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
