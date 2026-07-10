import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { VideoView, useVideoPlayer } from 'expo-video';
import {
  currentUserId,
  fetchRenderStatus,
  startRender,
  uploadClip,
  type RenderStyleInput,
} from '../../../lib/api/content';
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

async function pickVideoUri(): Promise<string | null> {
  // iOS shows its own permission sheet after selection when allowsEditing is
  // off — ask up front so it never interrupts mid-flow.
  await ImagePicker.requestMediaLibraryPermissionsAsync();
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
  return result.canceled ? null : (result.assets?.[0]?.uri ?? null);
}

// Always-on screening bay at the top of the cutting room: drop any clip in
// and watch it, even before an edit plan exists.
function QuickBay() {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const player = useVideoPlayer(null);

  const load = async () => {
    const uri = await pickVideoUri();
    if (!uri) return;
    setVideoUri(uri);
    try {
      await player.replaceAsync(uri);
      player.play();
    } catch {
      setVideoUri(null);
    }
  };

  return (
    <GlowBox glow style={{ padding: 14, marginBottom: 14 }}>
      <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 9, color: MONEY_COLORS.brass, letterSpacing: 2 }}>
        SCREENING BAY
      </Text>
      {videoUri ? (
        <>
          <VideoView
            player={player}
            style={{ width: '100%', height: 240, borderRadius: HUD_RADIUS, backgroundColor: '#000', marginTop: 8 }}
            contentFit="contain"
          />
          <Pressable onPress={load} accessibilityRole="button" accessibilityLabel="Swap clip" hitSlop={6}>
            <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 6 }}>
              ⇄ swap clip
            </Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          onPress={load}
          accessibilityRole="button"
          accessibilityLabel="Load a clip to screen"
          style={{
            marginTop: 8,
            borderWidth: 0.75,
            borderColor: HUD_COLORS.lineBright,
            borderStyle: 'dashed',
            borderRadius: HUD_RADIUS,
            paddingVertical: 30,
            alignItems: 'center',
            backgroundColor: HUD_COLORS.panelDeep,
          }}
        >
          <Ionicons name="videocam-outline" size={24} color={HUD_COLORS.mint} />
          <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 13, color: HUD_COLORS.mint, marginTop: 6, letterSpacing: 1 }}>
            DROP A CLIP IN ▸
          </Text>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 9, color: HUD_COLORS.mintSoft, marginTop: 3 }}>
            screen any video from your library right here
          </Text>
        </Pressable>
      )}
    </GlowBox>
  );
}

function Label({ text, color = HUD_COLORS.line }: { text: string; color?: string }) {
  return (
    <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 9, color, letterSpacing: 2, marginTop: 14, marginBottom: 6 }}>
      {text.toUpperCase()}
    </Text>
  );
}

function TogglePill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Toggle ${label}`}
      style={{
        borderWidth: 0.75,
        borderColor: active ? HUD_COLORS.lineBright : HUD_COLORS.line,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: active ? HUD_COLORS.panelDeep : 'transparent',
      }}
    >
      <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 10, color: active ? HUD_COLORS.mint : HUD_COLORS.mintSoft }}>
        {label}
      </Text>
    </Pressable>
  );
}

// The drone crew: pick raw clips, ship them to the cloud, get back a cut
// reel — captions burned in, zooms, transitions — sized 9:16 for posting.
function AutoCut({ plan }: { plan: EditPlan }) {
  const [clips, setClips] = useState<string[]>([]);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'rendering' | 'done' | 'error'>('idle');
  const [note, setNote] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pace, setPace] = useState<RenderStyleInput['pace']>('chill');
  const [captions, setCaptions] = useState(true);
  const [zoom, setZoom] = useState(true);
  const [filter, setFilter] = useState<RenderStyleInput['filter']>('none');
  const player = useVideoPlayer(null);
  const busy = phase === 'uploading' || phase === 'rendering';

  const pickClips = async () => {
    if (busy) return;
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: true,
      selectionLimit: 6,
    });
    if (!result.canceled) setClips((result.assets ?? []).map((a) => a.uri));
  };

  const render = async () => {
    if (busy || clips.length === 0) return;
    try {
      setPhase('uploading');
      setResultUrl(null);
      setSaved(false);
      const uid = await currentUserId();
      const paths: string[] = [];
      for (let i = 0; i < clips.length; i++) {
        setNote(`uploading clip ${i + 1}/${clips.length}…`);
        const path = `${uid}/${plan.id}/${Date.now()}-${i}.mp4`;
        await uploadClip(path, clips[i]);
        paths.push(path);
      }
      setPhase('rendering');
      setNote('the cloud is cutting — usually under a minute…');
      const started = await startRender(plan.id, paths, { pace, captions, zoom, filter });
      if ('error' in started) throw new Error(started.detail ?? started.error);
      for (let tries = 0; tries < 60; tries++) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        const status = await fetchRenderStatus(started.renderId);
        if ('error' in status) throw new Error(status.detail ?? status.error);
        if (status.status === 'done' && status.url) {
          setResultUrl(status.url);
          setPhase('done');
          setNote(null);
          try {
            await player.replaceAsync(status.url);
            player.play();
          } catch {
            // preview failing shouldn't hide the save button
          }
          return;
        }
        if (status.status === 'failed') throw new Error(status.detail ?? 'render failed');
      }
      throw new Error('render timed out — try again');
    } catch (err) {
      setPhase('error');
      const message = err instanceof Error ? err.message : 'render failed';
      setNote(
        message === 'not_configured'
          ? 'render engine not hooked up yet — ask claude for the one-time shotstack setup.'
          : `shanked it: ${message}`
      );
    }
  };

  const save = async () => {
    if (!resultUrl) return;
    try {
      setNote('saving to camera roll…');
      const dir = new Directory(Paths.cache, 'renders');
      try {
        dir.create();
      } catch {
        // already exists
      }
      const file = await File.downloadFileAsync(resultUrl, dir);
      await MediaLibrary.requestPermissionsAsync();
      await MediaLibrary.saveToLibraryAsync(file.uri);
      setSaved(true);
      setNote(null);
    } catch {
      setNote('save failed — try again');
    }
  };

  return (
    <>
      <Label text="auto-cut · cloud render" color={MONEY_COLORS.brass} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        <TogglePill label={pace === 'fast' ? 'pace: fast' : 'pace: chill'} active onPress={() => setPace(pace === 'fast' ? 'chill' : 'fast')} />
        <TogglePill label="captions" active={captions} onPress={() => setCaptions(!captions)} />
        <TogglePill label="zoom" active={zoom} onPress={() => setZoom(!zoom)} />
        <TogglePill
          label={`filter: ${filter}`}
          active={filter !== 'none'}
          onPress={() => setFilter(filter === 'none' ? 'boost' : filter === 'boost' ? 'muted' : 'none')}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={pickClips}
          accessibilityRole="button"
          accessibilityLabel="Pick clips for the auto cut"
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 10,
            borderWidth: 0.75,
            borderColor: HUD_COLORS.line,
            borderStyle: 'dashed',
            borderRadius: HUD_RADIUS,
          }}
        >
          <Text style={{ fontFamily: HUD_FONT, fontSize: 11, color: HUD_COLORS.mintSoft }}>
            {clips.length > 0 ? `⊕ ${clips.length} clip${clips.length === 1 ? '' : 's'} loaded` : '⊕ load clips'}
          </Text>
        </Pressable>
        <Pressable
          onPress={render}
          accessibilityRole="button"
          accessibilityLabel="Render the reel in the cloud"
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 10,
            backgroundColor: clips.length > 0 && !busy ? HUD_COLORS.panelDeep : 'transparent',
            borderWidth: 0.75,
            borderColor: clips.length > 0 && !busy ? HUD_COLORS.lineBright : HUD_COLORS.line,
            borderRadius: HUD_RADIUS,
          }}
        >
          <Text
            style={{
              fontFamily: HUD_FONT_BOLD,
              fontSize: 11,
              color: clips.length > 0 && !busy ? HUD_COLORS.mint : HUD_COLORS.line,
              letterSpacing: 1,
            }}
          >
            {busy ? 'CUTTING…' : '► RENDER THE REEL_'}
          </Text>
        </Pressable>
      </View>
      {note ? (
        <Text
          style={{
            fontFamily: HUD_FONT,
            fontSize: 10,
            lineHeight: 16,
            color: phase === 'error' ? HUD_COLORS.amber : HUD_COLORS.mintSoft,
            marginTop: 6,
          }}
        >
          {note}
        </Text>
      ) : null}
      {resultUrl ? (
        <>
          <VideoView
            player={player}
            style={{ width: '100%', height: 320, borderRadius: HUD_RADIUS, backgroundColor: '#000', marginTop: 10 }}
            contentFit="contain"
          />
          <Pressable
            onPress={save}
            accessibilityRole="button"
            accessibilityLabel="Save the rendered reel to your camera roll"
            style={{
              marginTop: 8,
              alignItems: 'center',
              paddingVertical: 10,
              backgroundColor: HUD_COLORS.panelDeep,
              borderWidth: 0.75,
              borderColor: HUD_COLORS.lineBright,
              borderRadius: HUD_RADIUS,
            }}
          >
            <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 11, color: HUD_COLORS.mint, letterSpacing: 1 }}>
              {saved ? '✓ SAVED — POST IT FROM INSTAGRAM' : '⤓ SAVE TO CAMERA ROLL'}
            </Text>
          </Pressable>
        </>
      ) : null}
    </>
  );
}

// Memoized: plan cards are heavy (video player, timeline) — only re-render
// when their own plan/idea rows actually change.
const PlanCard = React.memo(function PlanCard({ plan, idea }: { plan: EditPlan; idea: ReelIdea | undefined }) {
  const updateShots = useUpdateEditPlanShots();
  const director = useDirectPlan();
  const [copied, setCopied] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const player = useVideoPlayer(null);

  const pickVideo = async () => {
    const uri = await pickVideoUri();
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

      <AutoCut plan={plan} />

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
        {`music: ${plan.music} — add trending audio in the instagram composer when you post (better reach than baked-in audio)`}
      </Text>
    </GlowBox>
  );
});

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

        <QuickBay />

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
          <View
            style={{
              borderWidth: 0.75,
              borderColor: HUD_COLORS.line,
              borderRadius: HUD_RADIUS,
              padding: 14,
            }}
          >
            <Text style={{ fontFamily: HUD_FONT, fontSize: 12, lineHeight: 20, color: HUD_COLORS.mintSoft }}>
              no edits on the board yet. the flow: keep an idea in the ideas
              tab → build the edit here → the director ai recuts it however
              you tell him, and the beat timeline drives your clip preview.
            </Text>
            <Pressable
              onPress={() => router.replace('/content/ideas')}
              accessibilityRole="button"
              accessibilityLabel="Go get ideas"
              style={{
                marginTop: 10,
                alignItems: 'center',
                paddingVertical: 10,
                backgroundColor: HUD_COLORS.panelDeep,
                borderWidth: 0.75,
                borderColor: HUD_COLORS.lineBright,
                borderRadius: HUD_RADIUS,
              }}
            >
              <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 12, color: HUD_COLORS.mint, letterSpacing: 1 }}>
                GO GET IDEAS ▸
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
