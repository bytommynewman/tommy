/**
 * ODDLER — the rules.
 *
 * Open-answer trivia where only UNCOMMON correct answers score. Every prompt has
 * many right answers; the rarer yours is, the more "oddness" it earns, and
 * oddness is what grows your Oddler: an axolotl that collects horns, wings,
 * extra eyes and hats as you play.
 *
 * Pure rules, no imports, no clocks. Time arrives as `action.at`, stamped by
 * the room (see ../src/room.ts) — the client never supplies it. Randomness is a
 * seeded generator stored in state (`rng`), advanced inside applyAction.
 */

export const meta = { game: "Oddler", minPlayers: 1, maxPlayers: 2 };

export const ROUND_MS = 10_000;
/** Network slack past the 25s: a late-but-honest answer still counts. */
export const GRACE_MS = 2_000;
export const CLASSIC_ROUNDS = 7;
/** Duo: ten prompts, partners alternate, one team score. */
export const DUO_ROUNDS = 10;
export const ENDLESS_STRIKES = 3;
export const MODES = ["classic", "endless", "practice"];
/** Max prompt ids a player may ask us to avoid (seen in earlier runs). */
export const SEEN_CAP = 600;
/** Longest display name a locker may carry. */
export const NAME_MAX = 16;
export const COLOURS = ["pink", "mint", "lav", "sand", "slate", "char"];

/** Rarity ladder. `odd` is the one-line reason shown on the reveal screen. */
export const TIERS = [
  null,
  { id: 1, name: "Plain", pts: 10, odd: "The first thing everyone thinks of." },
  { id: 2, name: "Too Clever", pts: 15, odd: "Technically right. Cheeky, but it counts." },
  { id: 3, name: "Odd-ish", pts: 30, odd: "Most people would need a second to find this." },
  { id: 4, name: "Rare", pts: 60, odd: "A real dig. Few players land here." },
  { id: 5, name: "Deep Cut", pts: 85, odd: "Properly obscure. Your Oddler approves." },
  { id: 6, name: "One in an Oddlion", pts: 100, odd: "Almost nobody says this. Peak odd." },
];

/**
 * Every collectable part, by sprite id (public/art/<id>.png). `slot` says where
 * it sits on the Oddler and how many of that slot exist; the client owns the
 * exact pixel anchors. `tier` is the lowest rarity that can earn it.
 */
export const PARTS = [
  // horn sheet — row 1 curved horns, row 2 spike ridges, row 3 tall spikes, row 4 nubs
  { id: "horn-00", slot: "horn", tier: 5 }, { id: "horn-01", slot: "horn", tier: 5 },
  { id: "horn-02", slot: "horn", tier: 5 }, { id: "horn-03", slot: "horn", tier: 5 },
  { id: "horn-04", slot: "back", tier: 5 }, { id: "horn-05", slot: "back", tier: 5 },
  { id: "horn-06", slot: "back", tier: 5 }, { id: "horn-07", slot: "back", tier: 5 },
  { id: "horn-08", slot: "horn", tier: 4 }, { id: "horn-09", slot: "horn", tier: 4 },
  { id: "horn-10", slot: "horn", tier: 4 }, { id: "horn-11", slot: "horn", tier: 4 },
  { id: "horn-12", slot: "nub", tier: 3 }, { id: "horn-13", slot: "nub", tier: 3 },
  { id: "horn-14", slot: "nub", tier: 3 }, { id: "horn-15", slot: "nub", tier: 3 },
  // wing sheet — row 1 wings, row 2 eye stalks, row 3 antennae/tentacles, row 4 novelties
  { id: "wing-00", slot: "wing", tier: 6 }, { id: "wing-01", slot: "wing", tier: 6 },
  { id: "wing-02", slot: "wing", tier: 6 }, { id: "wing-03", slot: "wing", tier: 6 },
  { id: "wing-04", slot: "eye", tier: 5 }, { id: "wing-05", slot: "eye", tier: 5 },
  { id: "wing-06", slot: "eye", tier: 5 }, { id: "wing-07", slot: "eye", tier: 5 },
  { id: "wing-08", slot: "antenna", tier: 4 }, { id: "wing-09", slot: "antenna", tier: 5 },
  { id: "wing-10", slot: "antenna", tier: 4 }, { id: "wing-11", slot: "antenna", tier: 5 },
  { id: "wing-12", slot: "hat", tier: 6 }, { id: "wing-13", slot: "back", tier: 6 },
  { id: "wing-14", slot: "hat", tier: 6 }, { id: "wing-15", slot: "hat", tier: 6 },
  // accessory sheet — level rewards, never earned mid-game (tier 0): one per level from 2
  { id: "acc-00", slot: "hat", tier: 0, level: 2 }, { id: "acc-12", slot: "neck", tier: 0, level: 3 },
  { id: "acc-04", slot: "face", tier: 0, level: 4 }, { id: "acc-08", slot: "held", tier: 0, level: 5 },
  { id: "acc-05", slot: "flower", tier: 0, level: 6 }, { id: "acc-03", slot: "hat", tier: 0, level: 7 },
  { id: "acc-14", slot: "neck", tier: 0, level: 8 }, { id: "acc-10", slot: "held", tier: 0, level: 8 },
  { id: "acc-13", slot: "pack", tier: 0, level: 9 }, { id: "acc-01", slot: "hat", tier: 0, level: 9 },
  { id: "acc-06", slot: "hat", tier: 0, level: 10 }, { id: "acc-11", slot: "held", tier: 0, level: 10 },
  { id: "acc-09", slot: "held", tier: 0, level: 11 }, { id: "acc-07", slot: "hat", tier: 0, level: 11 },
  { id: "acc-15", slot: "pack", tier: 0, level: 12 }, { id: "acc-02", slot: "hat", tier: 0, level: 12 },
];

/**
 * The question bank is assembled from every `1*-bank*.js` piece in this
 * folder (build-logic.sh concatenates them in name order). Each piece appends
 * its rows here, so an auto-generated file is just another piece.
 */
export const BANKS = [];

/**
 * Name banners: the plate behind a player's name. Unlocked by level, picked in
 * the locker. The client owns the look (index.html .nameplate.b-<id>).
 */
export const BANNERS = [
  { id: "plain", name: "Plain", level: 1 },
  { id: "lime", name: "Lime Edge", level: 2 },
  { id: "stripe", name: "Hazard Stripe", level: 4 },
  { id: "ember", name: "Ember", level: 6 },
  { id: "storm", name: "Storm", level: 8 },
  { id: "neon", name: "Neon", level: 10 },
  { id: "holo", name: "Holo", level: 13 },
  { id: "legend", name: "Legend", level: 16 },
];

/** How many of each slot an Oddler can carry. */
export const SLOT_CAP = {
  horn: 3, back: 1, nub: 2, wing: 2, eye: 2, antenna: 1,
  hat: 1, face: 1, flower: 1, held: 1, neck: 1, pack: 1,
};
