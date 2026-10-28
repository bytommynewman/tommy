"use client";

import { Heart } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { setBlock, setFollow, toggleLike, vote } from "@/app/actions";
import { btn } from "../ui/primitives";

export function LikeButton({ id, liked, count }: { id: string; liked: boolean; count: number }) {
  const [state, setState] = useOptimistic({ liked, count });
  const [, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={state.liked}
      aria-label={state.liked ? "Unlike" : "Like"}
      onClick={() => start(async () => {
        setState({ liked: !state.liked, count: state.count + (state.liked ? -1 : 1) });
        await toggleLike(id);
      })}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm transition hover:bg-ink-800 ${state.liked ? "text-volt" : "text-ink-400 hover:text-white"}`}
    >
      <Heart className={`size-4 ${state.liked ? "fill-current" : ""}`} /><span className="tabular-nums">{state.count}</span>
    </button>
  );
}

export function FollowButton({ userId, following }: { userId: string; following: boolean }) {
  const [state, setState] = useOptimistic(following);
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => { setState(!state); await setFollow(userId, !state); })}
      className={btn(state ? "secondary" : "primary", "sm", "min-w-24")}>
      {state ? "Following" : "Follow"}
    </button>
  );
}

export function BlockButton({ userId, blocked }: { userId: string; blocked: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} className={btn("ghost", "sm")}
      onClick={() => { if (blocked || confirm("Block this user? They won't see your takes and you won't see theirs.")) start(async () => { await setBlock(userId, !blocked); }); }}>
      {blocked ? "Unblock" : "Block"}
    </button>
  );
}

export function DebateVote({ id, agree, disagree, mine }: { id: string; agree: number; disagree: number; mine: boolean | null }) {
  const [state, setState] = useOptimistic({ agree, disagree, mine });
  const [, start] = useTransition();
  const total = state.agree + state.disagree;
  const pctAgree = total ? Math.round((state.agree / total) * 100) : 50;
  const cast = (a: boolean) => start(async () => {
    setState({
      agree: state.agree + (a ? 1 : 0) - (state.mine === true ? 1 : 0),
      disagree: state.disagree + (!a ? 1 : 0) - (state.mine === false ? 1 : 0),
      mine: a,
    });
    await vote(id, a);
  });
  return (
    <div>
      <div className="flex gap-2">
        <button type="button" onClick={() => cast(true)} aria-pressed={state.mine === true} className={btn(state.mine === true ? "primary" : "secondary", "md", "flex-1")}>Agree</button>
        <button type="button" onClick={() => cast(false)} aria-pressed={state.mine === false} className={btn(state.mine === false ? "danger" : "secondary", "md", "flex-1")}>Disagree</button>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-loss/60"><div className="h-full bg-volt transition-all" style={{ width: `${pctAgree}%` }} /></div>
      <div className="mt-1 flex justify-between text-xs text-ink-400"><span>{pctAgree}% agree</span><span>{total} votes</span></div>
    </div>
  );
}
