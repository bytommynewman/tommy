import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { format } from 'date-fns';
import { HUD_COLORS, HUD_FONT, HUD_FONT_BOLD } from '../../constants/hud';
import { GlowBox } from './GlowBox';
import { ScratchMascot } from '../scratch/ScratchMascot';
import { useHabits, useRecentLogs, useRelapses } from '../../lib/hooks/useHabits';
import { useDailyRead } from '../../lib/hooks/useScratch';
import { daysClean } from '../../lib/streaks';

// Same data contract as the old DailyReadCard: prefer the agent-written read,
// fall back to a locally composed read whenever the agent one isn't ready.
export function BriefingCard() {
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useRecentLogs(1);
  const { data: relapses = [] } = useRelapses();
  const { data: agentRead, isLoading } = useDailyRead();

  const fallback = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const doneIds = new Set(
      logs.filter((l) => l.log_date === today && l.status === 'done').map((l) => l.habit_id)
    );
    const remaining = habits.length - habits.filter((h) => doneIds.has(h.id)).length;
    const out: string[] = [];
    if (habits.length === 0) {
      out.push('no habits on the card yet — set up your first ones in recovery.');
    } else if (remaining === 0) {
      out.push('card is clean — everything checked off today. that is how rounds are won.');
    } else {
      out.push(`${remaining} thing${remaining === 1 ? '' : 's'} still open on today's card.`);
    }
    const recovery = habits.filter((h) => h.kind === 'recovery');
    const best = recovery
      .map((h) => ({ habit: h, days: daysClean(h, relapses) }))
      .sort((a, b) => b.days - a.days)[0];
    if (best && best.days > 0) {
      out.push(`${best.days} days clean on ${best.habit.name.toLowerCase()} — protect that streak.`);
    }
    return out.join(' ');
  }, [habits, logs, relapses]);

  const read = agentRead?.reply ? agentRead.reply.replace(/\n+/g, ' ') : null;
  const body = isLoading && !read ? 'reading the course…' : (read ?? fallback);

  return (
    <GlowBox glow style={{ padding: 16, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        {/* The character himself, full size — leaning on his driver, not
            cropped into a badge. He IS the home page. */}
        <ScratchMascot size={116} />
        <View style={{ flex: 1, paddingBottom: 8 }}>
          <Text style={{ fontFamily: HUD_FONT_BOLD, fontSize: 18, color: HUD_COLORS.text }}>
            Scratch
          </Text>
          <Text style={{ fontFamily: HUD_FONT, fontSize: 12, color: HUD_COLORS.mintSoft, marginTop: 2 }}>
            your caddie · on the bag
          </Text>
        </View>
      </View>
      <Text style={{ fontFamily: HUD_FONT, fontSize: 13, lineHeight: 21, color: HUD_COLORS.text, marginTop: 10 }}>
        {body}
      </Text>
      <Text style={{ fontFamily: HUD_FONT, fontSize: 10, color: HUD_COLORS.mintSoft, marginTop: 8, opacity: 0.7 }}>
        {read ? 'fresh every morning' : 'scratch takes over once connected'}
      </Text>
    </GlowBox>
  );
}
