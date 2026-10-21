"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Camera, Check, Download, Trash2 } from "lucide-react";
import { changeEmail, changePassword, changeUsername, deleteAccount, removeAvatar, updatePrivacy, updateProfile, uploadAvatar, type ActionState } from "@/app/actions";
import { FormError } from "@/components/app/forms";
import { SubmitButton } from "@/components/ui/client";
import { Avatar, btn, Field, inputCls } from "@/components/ui/primitives";

const MAX_BYTES = 8 * 1024 * 1024;
export const COLORS = ["#22E58A", "#5B8CFF", "#FF6B5B", "#F5C542", "#B57BFF", "#3DD6D0", "#FF9F43", "#FF5FA2"];
const COLOR_NAMES = ["Green", "Blue", "Coral", "Gold", "Purple", "Teal", "Orange", "Pink"];
const LEAGUES = ["NFL", "NBA", "NCAAF", "NCAAB", "NHL", "MLB"];
const MAX_TEAMS = 5;

export interface TeamOption { id: string; league: string; label: string }

export function PhotoForm({ name, color, src }: { name: string; color: string; src?: string }) {
  const [state, action] = useActionState(uploadAvatar, undefined);
  const [removed, startRemove] = useTransition();
  const [removeState, setRemoveState] = useState<ActionState>();
  const [clientError, setClientError] = useState<string>();
  const form = useRef<HTMLFormElement>(null);
  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar name={name} color={color} size={80} src={src} />
        <div className="flex flex-wrap gap-2">
          <form ref={form} action={action}>
            <label className={`${btn("secondary", "sm")} cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-volt`}>
              <Camera className="size-4" />{src ? "Change photo" : "Upload photo"}
              <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" aria-label="Profile photo"
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0];
                  if (!f) return;
                  if (f.size > MAX_BYTES) { setClientError("Image is too large (max 8 MB)"); e.currentTarget.value = ""; return; }
                  setClientError(undefined); setRemoveState(undefined); form.current?.requestSubmit();
                }} />
            </label>
          </form>
          {src && <button type="button" disabled={removed} className={btn("ghost", "sm")} onClick={() => startRemove(async () => { setRemoveState(await removeAvatar()); })}>Remove photo</button>}
        </div>
      </div>
      <p className="mt-2 text-xs text-ink-400">JPG, PNG or WebP up to 8 MB. We crop it to a square and strip location and camera data.</p>
      <div className="mt-2"><FormError state={clientError ? { error: clientError } : removeState ?? state} /></div>
    </div>
  );
}

export function UsernameForm({ username, lockedUntil }: { username: string; lockedUntil?: string }) {
  const [state, action] = useActionState(changeUsername, undefined);
  const date = lockedUntil ? new Date(lockedUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : null;
  return (
    <form action={action} className="space-y-3">
      <Field label="Username" hint={date ? `You can change this again on ${date}.` : "3–20 letters, numbers or underscores. You can change it once every 30 days; your old link redirects."}>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">@</span>
            <input name="username" defaultValue={username} minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" disabled={!!date} className={`${inputCls} pl-7`} />
          </div>
          <SubmitButton variant="secondary" disabled={!!date}>Change</SubmitButton>
        </div>
      </Field>
      <FormError state={state} />
    </form>
  );
}

export function ProfileForm({ displayName, bio, location, website, color, leagues, teams, teamOptions }:
  { displayName: string; bio: string; location: string; website: string; color: string; leagues: string[]; teams: string[]; teamOptions: TeamOption[] }) {
  const [state, action] = useActionState(updateProfile, undefined);
  const [lg, setLg] = useState(new Set(leagues));
  const [picked, setPicked] = useState(new Set(teams));
  const [swatch, setSwatch] = useState(color);
  const activeTeams = [...picked].filter((t) => lg.has(teamOptions.find((o) => o.id === t)?.league ?? ""));
  const toggleLeague = (l: string, on: boolean) => setLg((s) => { const n = new Set(s); if (on) n.add(l); else n.delete(l); return n; });
  const toggleTeam = (t: string, on: boolean) => setPicked((s) => { const n = new Set(s); if (on) n.add(t); else n.delete(t); return n; });
  return (
    <form action={action} className="space-y-4">
      <Field label="Display name"><input name="displayName" defaultValue={displayName} maxLength={40} required autoComplete="name" className={inputCls} /></Field>
      <Field label="Bio" hint="160 characters max."><textarea name="bio" defaultValue={bio} maxLength={160} rows={2} className={`${inputCls} resize-none`} /></Field>
      <Field label="Location (optional)"><input name="location" defaultValue={location} maxLength={40} autoComplete="off" placeholder="Ithaca, NY" className={inputCls} /></Field>
      <Field label="Link (optional)" hint="One website or social link. Shown on your profile."><input name="website" type="url" inputMode="url" defaultValue={website} maxLength={200} autoCapitalize="none" placeholder="https://instagram.com/you" className={inputCls} /></Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-ink-200">Avatar color</legend>
        <div className="flex flex-wrap gap-2.5">{COLORS.map((c, i) => (
          <label key={c} className="cursor-pointer" title={COLOR_NAMES[i]}>
            <input type="radio" name="avatarColor" value={c} checked={swatch === c} onChange={() => setSwatch(c)} className="peer sr-only" aria-label={COLOR_NAMES[i]} />
            <span className="flex size-9 items-center justify-center rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-ink-850 peer-checked:ring-white peer-focus-visible:ring-volt" style={{ background: c }}>{swatch === c && <Check className="size-4 text-ink-950" />}</span>
          </label>
        ))}</div>
        <p className="mt-1.5 text-xs text-ink-400">Used for your initial when you don’t have a photo.</p>
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-ink-200">Favorite leagues</legend>
        <div className="flex flex-wrap gap-2">{LEAGUES.map((l) => (
          <label key={l} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink-900 px-3 py-1.5 text-sm ring-1 ring-ink-700 has-checked:bg-volt/10 has-checked:ring-volt">
            <input type="checkbox" name="leagues" value={l} checked={lg.has(l)} onChange={(e) => toggleLeague(l, e.target.checked)} className="accent-[var(--color-volt)]" />{l}
          </label>
        ))}</div>
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 flex w-full items-baseline justify-between text-sm font-semibold text-ink-200">Favorite teams<span className="text-xs font-normal text-ink-400">{activeTeams.length}/{MAX_TEAMS}</span></legend>
        {lg.size === 0 ? <p className="text-xs text-ink-400">Pick a league first.</p> : (
          <div className="space-y-2">{LEAGUES.filter((l) => lg.has(l)).map((l, i) => (
            <details key={l} open={i === 0} className="rounded-xl bg-ink-900 ring-1 ring-ink-700">
              <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold text-ink-100">{l}<span className="ml-2 text-xs font-normal text-ink-400">{activeTeams.filter((t) => teamOptions.find((o) => o.id === t)?.league === l).length || ""}</span></summary>
              <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto px-2 pb-2 min-[420px]:grid-cols-2">{teamOptions.filter((o) => o.league === l).map((o) => {
                const on = picked.has(o.id);
                return (
                  <label key={o.id} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm has-checked:bg-volt/10 has-checked:text-white ${!on && activeTeams.length >= MAX_TEAMS ? "opacity-40" : "text-ink-200"}`}>
                    <input type="checkbox" name="teams" value={o.id} checked={on} disabled={!on && activeTeams.length >= MAX_TEAMS} onChange={(e) => toggleTeam(o.id, e.target.checked)} className="accent-[var(--color-volt)]" />{o.label}
                  </label>
                );
              })}</div>
            </details>
          ))}</div>
        )}
      </fieldset>
      <FormError state={state} />
      <SubmitButton>Save profile</SubmitButton>
    </form>
  );
}

export function PrivacyForm({ isPrivate }: { isPrivate: boolean }) {
  const [state, action] = useActionState(updatePrivacy, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className="flex items-start gap-3 rounded-xl bg-ink-900 p-3 ring-1 ring-ink-700">
        <input type="checkbox" name="private" defaultChecked={isPrivate} className="mt-1 size-4 accent-[var(--color-volt)]" />
        <span><span className="block text-sm font-semibold text-white">Private account</span><span className="text-xs text-ink-400">Only followers see your takes in feeds. Leaderboards hide private accounts.</span></span>
      </label>
      <FormError state={state} />
      <SubmitButton variant="secondary">Save privacy</SubmitButton>
    </form>
  );
}

export function EmailForm({ email }: { email: string }) {
  const [state, action] = useActionState(changeEmail, undefined);
  return (
    <form action={action} className="space-y-3">
      <h3 className="text-sm font-bold text-white">Email</h3>
      <Field label="New email" hint={`Currently ${email}`}><input name="email" type="email" autoComplete="email" required className={inputCls} /></Field>
      <Field label="Current password"><input name="password" type="password" autoComplete="current-password" required className={inputCls} /></Field>
      <FormError state={state} />
      <SubmitButton variant="secondary">Update email</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-3">
      <h3 className="text-sm font-bold text-white">Password</h3>
      <Field label="Current password"><input name="current" type="password" autoComplete="current-password" required className={inputCls} /></Field>
      <Field label="New password" hint="At least 8 characters."><input name="next" type="password" autoComplete="new-password" minLength={8} required className={inputCls} /></Field>
      <Field label="Confirm new password"><input name="confirm" type="password" autoComplete="new-password" minLength={8} required className={inputCls} /></Field>
      <FormError state={state} />
      <SubmitButton variant="secondary">Update password</SubmitButton>
    </form>
  );
}

export function DownloadData() {
  return <a href="/api/export" download className={btn("secondary", "md")}><Download className="size-4" />Download my data (JSON)</a>;
}

export function DeleteForm({ username }: { username: string }) {
  const [state, action] = useActionState(deleteAccount, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label={`Type your username (@${username}) to confirm`}><input name="username" autoComplete="off" autoCapitalize="none" required className={inputCls} /></Field>
      <Field label="Password"><input name="password" type="password" autoComplete="current-password" required className={inputCls} /></Field>
      <FormError state={state} />
      <SubmitButton variant="danger" pendingText="Deleting…"><Trash2 className="size-4" />Delete my account</SubmitButton>
    </form>
  );
}
