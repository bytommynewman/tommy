import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { ContentHeader } from '../../../components/content/ContentHeader';
import { GlowBox } from '../../../components/hud/GlowBox';
import { SkeletonCard } from '../../../components/hud/SkeletonCard';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD, HUD_RADIUS } from '../../../constants/hud';
import {
  useBuildEditPlan,
  useEditPlans,
  useIdeas,
  useUpdateEditPlanShots,
} from '../../../lib/hooks/useContent';
import type { EditPlan, ReelIdea } from '../../../types/database.types';

function secs(n: number): string {
  return `${n.toFixed(1)}s`;
}

function PlanCard({ plan, idea }: { plan: EditPlan; idea: ReelIdea | undefined }) {
  const updateShots = useUpdateEditPlanShots();
  const [copied, setCopied] = useState(false);

  const toggleShot = (index: number) => {
    const next = plan.shot_list.map((s, i) => (i === index ? { ...s, done: !s.done } : s));
    updateShots.mutate({ id: plan.id, shotList: next });
  };

  const copyCaption = async () => {
    await Clipboard.setStringAsync(`${plan.caption}\n\n${plan.hashtags}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <GlowBox glow style={{ padding: 12, marginBottom: 12 }}>
      <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 14, color: HUD_COLORS.text }}>
        {idea ? idea.hook : 'edit plan'}
      </Text>
      <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 2 }}>
        {idea ? idea.title.toLowerCase() : ''}
      </Text>

      <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.line, marginTop: 12, marginBottom: 6 }}>
        {'// shot list — tick as you film'}
      </Text>
      {plan.shot_list.map((shot, i) => (
        <Pressable
          key={`${plan.id}-shot-${i}`}
          onPress={() => toggleShot(i)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!shot.done }}
          accessibilityLabel={shot.shot}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 5 }}
        >
          <Ionicons
            name={shot.done ? 'checkbox-outline' : 'square-outline'}
            size={16}
            color={shot.done ? HUD_COLORS.mint : HUD_COLORS.mintSoft}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: HUD_FONT,
                fontSize: 12,
                color: shot.done ? HUD_COLORS.mintSoft : HUD_COLORS.text,
                textDecorationLine: shot.done ? 'line-through' : 'none',
              }}
            >
              {shot.shot}
            </Text>
            {shot.note ? (
              <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft }}>{shot.note}</Text>
            ) : null}
          </View>
        </Pressable>
      ))}

      <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.line, marginTop: 12, marginBottom: 6 }}>
        {'// the cut'}
      </Text>
      {plan.beats.map((beat, i) => (
        <View key={`${plan.id}-beat-${i}`} style={{ flexDirection: 'row', gap: 10, paddingVertical: 3 }}>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.amber, width: 86 }}>
            {`${secs(beat.start)}–${secs(beat.end)}`}
          </Text>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.text, flex: 1 }}>
            {beat.description}
          </Text>
        </View>
      ))}

      <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.line, marginTop: 12, marginBottom: 6 }}>
        {'// caption + tags'}
      </Text>
      <Text style={{ fontFamily: HUD_FONT, fontSize: 12, lineHeight: 19, color: HUD_COLORS.text }}>
        {plan.caption}
      </Text>
      <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 4 }}>
        {plan.hashtags}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <Pressable
          onPress={copyCaption}
          accessibilityRole="button"
          accessibilityLabel="Copy caption and hashtags"
          style={{
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 9,
            backgroundColor: HUD_COLORS.panelDeep,
            borderWidth: 0.75,
            borderColor: HUD_COLORS.lineBright,
            borderRadius: HUD_RADIUS,
          }}
        >
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color={HUD_COLORS.mint} />
          <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.mint }}>
            {copied ? 'copied' : 'copy caption + tags'}
          </Text>
        </Pressable>
      </View>
      <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 10 }}>
        {`music: ${plan.music}`}
      </Text>
    </GlowBox>
  );
}

export default function EditorScreen() {
  const { data: ideas = [], isLoading: ideasLoading, isRefetching: ideasRefetching, refetch: refetchIdeas } = useIdeas();
  const { data: plans = [], isLoading: plansLoading, isRefetching: plansRefetching, refetch: refetchPlans } = useEditPlans();
  const isLoading = ideasLoading || plansLoading;
  const build = useBuildEditPlan();
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [lastError, setLastError] = useState(false);

  const plannedIdeaIds = new Set(plans.map((p) => p.idea_id));
  const buildable = ideas.filter(
    (i) => (i.status === 'saved' || i.status === 'planned') && !plannedIdeaIds.has(i.id)
  );
  const ideasById = new Map(ideas.map((i) => [i.id, i]));

  const onBuild = (ideaId: string) => {
    if (build.isPending) return;
    setLastError(false);
    setBuildingId(ideaId);
    build.mutate(ideaId, {
      onSuccess: (result) => {
        if ('error' in result) setLastError(true);
        setBuildingId(null);
      },
      onError: () => {
        setLastError(true);
        setBuildingId(null);
      },
    });
  };

  const refreshing = ideasRefetching || plansRefetching;
  const onRefresh = () => {
    refetchIdeas();
    refetchPlans();
  };

  return (
    <View style={{ flex: 1, backgroundColor: HUD_COLORS.bg }}>
      <ContentHeader active="editor" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD_COLORS.mint} />}
      >
        {lastError ? (
          <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.amber, marginBottom: 12 }}>
            shanked that one — run it again.
          </Text>
        ) : null}
        {isLoading ? (
          <>
            <SkeletonCard lines={4} />
            <SkeletonCard lines={3} />
          </>
        ) : null}
        {buildable.length > 0 ? (
          <>
            <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.line, marginBottom: 8 }}>
              {'// ready for the director'}
            </Text>
            {buildable.map((idea) => (
              <View
                key={idea.id}
                style={{
                  borderWidth: 0.75,
                  borderColor: HUD_COLORS.line,
                  borderRadius: HUD_RADIUS,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 13, color: HUD_COLORS.text }}>
                  {idea.hook}
                </Text>
                <Pressable
                  onPress={() => onBuild(idea.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Build the edit for ${idea.title}`}
                  style={{
                    marginTop: 8,
                    alignItems: 'center',
                    paddingVertical: 8,
                    backgroundColor: HUD_COLORS.panelDeep,
                    borderWidth: 0.75,
                    borderColor: HUD_COLORS.lineBright,
                    borderRadius: HUD_RADIUS,
                  }}
                >
                  <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.mint }}>
                    {buildingId === idea.id ? 'scratch is cutting…' : 'build the edit'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : null}
        {plans.length > 0 ? (
          <>
            <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.line, marginVertical: 8 }}>
              {'// your edits'}
            </Text>
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} idea={ideasById.get(plan.idea_id)} />
            ))}
          </>
        ) : null}
        {!isLoading && buildable.length === 0 && plans.length === 0 ? (
          <Text style={{ fontFamily: HUD_FONT, fontSize: 12, lineHeight: 20, color: HUD_COLORS.mintSoft }}>
            nothing on the cutting board. save an idea in the ideas tab, then
            come back — scratch turns it into a full shoot-and-edit plan.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
