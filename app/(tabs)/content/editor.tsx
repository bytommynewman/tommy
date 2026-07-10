import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { ContentHeader } from '../../../components/content/ContentHeader';
import { GlowBox } from '../../../components/hud/GlowBox';
import { SkeletonCard } from '../../../components/hud/SkeletonCard';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD, HUD_RADIUS, MONEY_COLORS } from '../../../constants/hud';
import {
  useBuildEditPlan,
  useDirectPlan,
  useEditPlans,
  useIdeas,
  useUpdateEditPlanShots,
} from '../../../lib/hooks/useContent';
import type { EditPlan, ReelIdea } from '../../../types/database.types';

function secs(n: number): string {
  return `${n.toFixed(1)}s`;
}

function Label({ text, color = HUD_COLORS.line }: { text: string; color?: string }) {
  return (
    <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 9, color, letterSpacing: 2, marginTop: 14, marginBottom: 6 }}>
      {text.toUpperCase()}
    </Text>
  );
}

function PlanCard({ plan, idea }: { plan: EditPlan; idea: ReelIdea | undefined }) {
  const updateShots = useUpdateEditPlanShots();
  const director = useDirectPlan();
  const [copied, setCopied] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const player = useVideoPlayer(null);

  const pickVideo = async () => {
    // iOS shows its own permission sheet after selection when allowsEditing
    // is off — ask up front so it never interrupts mid-flow.
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
    const uri = result.canceled ? null : (result.assets?.[0]?.uri ?? null);
    if (!uri) return;
    setVideoUri(uri);
    try {
      await player.replaceAsync(uri);
      player.play();
    } catch {
      setVideoUri(null);
    }
  };

  const seekTo = (s: number) => {
    if (!videoUri) return;
    player.currentTime = s;
    player.play();
  };

  const toggleShot = (index: number) => {
    const next = plan.shot_list.map((s, i) => (i === index ? { ...s, done: !s.done } : s));
    updateShots.mutate({ id: plan.id, shotList: next });
  };

  const copyCaption = async () => {
    await Clipboard.setStringAsync(`${plan.caption}\n\n${plan.hashtags}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const askDirector = () => {
    const message = note.trim();
    if (!message || director.isPending) return;
    setReply(null);
    director.mutate(
      { planId: plan.id, message },
      {
        onSuccess: (result) => {
          if ('error' in result) setReply('lost the signal — try that again.');
          else {
            setReply(result.reply);
            setNote('');
          }
        },
        onError: () => setReply('lost the signal — try that again.'),
      }
    );
  };

  const totalLen = plan.beats.length > 0 ? Math.max(...plan.beats.map((b) => b.end)) : 0;

  return (
    <GlowBox glow style={{ padding: 14, marginBottom: 14 }}>
      <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 15, color: HUD_COLORS.text }}>
        {idea ? idea.hook : 'edit plan'}
      </Text>
      <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 2 }}>
        {idea ? idea.title.toLowerCase() : ''}
      </Text>

      <Label text="footage bay" color={MONEY_COLORS.brass} />
      {videoUri ? (
        <>
          <VideoView
            player={player}
            style={{ width: '100%', height: 220, borderRadius: HUD_RADIUS, backgroundColor: '#000' }}
            contentFit="contain"
          />
          <Pressable onPress={pickVideo} accessibilityRole="button" accessibilityLabel="Swap clip" hitSlop={6}>
            <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 6 }}>
              ⇄ swap clip
            </Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          onPress={pickVideo}
          accessibilityRole="button"
          accessibilityLabel="Load footage from your library"
          style={{
            borderWidth: 0.75,
            borderColor: HUD_COLORS.lineBright,
            borderStyle: 'dashed',
            borderRadius: HUD_RADIUS,
            paddingVertical: 26,
            alignItems: 'center',
            backgroundColor: HUD_COLORS.panelDeep,
          }}
        >
          <Ionicons name="videocam-outline" size={22} color={HUD_COLORS.mint} />
          <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 12, color: HUD_COLORS.mint, marginTop: 6 }}>
            LOAD FOOTAGE ▸
          </Text>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft, marginTop: 3 }}>
            pull a clip from your library and cut against the plan
          </Text>
        </Pressable>
      )}

      {plan.beats.length > 0 ? (
        <>
          <Label text={`the cut · ${secs(totalLen)}${videoUri ? ' · tap a beat to jump the preview' : ''}`} />
          <View style={{ flexDirection: 'row', gap: 2, height: 26 }}>
            {plan.beats.map((beat, i) => (
              <Pressable
                key={`${plan.id}-seg-${i}`}
                onPress={() => seekTo(beat.start)}
                accessibilityRole="button"
                accessibilityLabel={`Jump to ${beat.description}`}
                style={{
                  flex: Math.max(beat.end - beat.start, 0.5),
                  borderWidth: 0.75,
                  borderColor: i % 2 === 0 ? HUD_COLORS.lineBright : HUD_COLORS.line,
                  borderRadius: 2,
                  backgroundColor: i % 2 === 0 ? HUD_COLORS.panelDeep : HUD_COLORS.panel,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 8, color: HUD_COLORS.mint }}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ marginTop: 6 }}>
            {plan.beats.map((beat, i) => (
              <Pressable
                key={`${plan.id}-beat-${i}`}
                onPress={() => seekTo(beat.start)}
                accessibilityRole="button"
                accessibilityLabel={`Beat ${i + 1}: ${beat.description}`}
                style={{ flexDirection: 'row', gap: 10, paddingVertical: 3 }}
              >
                <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.amber, width: 86 }}>
                  {`${secs(beat.start)}–${secs(beat.end)}`}
                </Text>
                <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.text, flex: 1 }}>
                  {beat.description}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Label text="shot list · tick as you film" />
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

      <Label text="director ai" color={MONEY_COLORS.brass} />
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="make it faster / punchier caption / new hook…"
          placeholderTextColor={HUD_COLORS.line}
          editable={!director.isPending}
          onSubmitEditing={askDirector}
          returnKeyType="send"
          accessibilityLabel="Tell the director what to change"
          style={{
            flex: 1,
            fontFamily: HUD_FONT,
            fontSize: 12,
            color: HUD_COLORS.text,
            borderWidth: 0.75,
            borderColor: HUD_COLORS.line,
            borderRadius: HUD_RADIUS,
            paddingHorizontal: 10,
            paddingVertical: 9,
            backgroundColor: HUD_COLORS.panelDeep,
          }}
        />
        <Pressable
          onPress={askDirector}
          accessibilityRole="button"
          accessibilityLabel="Send to the director"
          style={{
            width: 42,
            borderWidth: 0.75,
            borderColor: HUD_COLORS.lineBright,
            borderRadius: HUD_RADIUS,
            backgroundColor: HUD_COLORS.panelDeep,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={director.isPending ? 'hourglass-outline' : 'send'} size={15} color={HUD_COLORS.mint} />
        </Pressable>
      </View>
      {director.isPending ? (
        <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 6 }}>
          director is recutting…
        </Text>
      ) : null}
      {reply ? (
        <View
          style={{
            marginTop: 8,
            borderLeftWidth: 2,
            borderLeftColor: HUD_COLORS.mint,
            paddingLeft: 10,
            paddingVertical: 2,
          }}
        >
          <Text style={{ fontFamily: HUD_FONT, fontSize: 11, lineHeight: 18, color: HUD_COLORS.text }}>{reply}</Text>
        </View>
      ) : null}

      <Label text="caption + tags" />
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 10, color: MONEY_COLORS.brass, letterSpacing: 2.5 }}>
            CUTTING ROOM
          </Text>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mint }}>
            {`● ${plans.length} EDIT${plans.length === 1 ? '' : 'S'} ON THE BOARD`}
          </Text>
        </View>

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
