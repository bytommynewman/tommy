import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "../domain";
import { db } from "./db";
import { makeToken, readToken } from "./password";

export const SESSION_COOKIE = "gr_session";

export const currentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const id = readToken(token);
  const u = id ? db().users.find((x) => x.id === id) : undefined;
  return u && !u.deletedAt ? u : null; // deleted accounts' tokens stop working immediately
});

/** Data-access-layer guard: every authenticated page and action goes through this. */
export async function requireUser(opts: { allowUnonboarded?: boolean } = {}): Promise<User> {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (!u.onboarded && !opts.allowUnonboarded) redirect("/onboarding");
  return u;
}

export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/feed");
  return u;
}

export async function startSession(userId: string) {
  (await cookies()).set(SESSION_COOKIE, makeToken(userId), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86_400,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Strip secrets before anything leaves the server. */
export type PublicUser = Omit<User, "passwordHash" | "email">;
export function toPublic(u: User): PublicUser {
  const rest: Partial<User> = { ...u };
  delete rest.passwordHash;
  delete rest.email;
  return rest as PublicUser;
}
