/**
 * The Oddler's wardrobe: where every part sits on the base sprite, what each
 * part is called, and the one function that draws a creature. Shared by the
 * game client and the locker so they can never disagree.
 */

export const BASE = { pink: "axo-base", mint: "col-mint", lav: "col-lav", sand: "col-sand", slate: "col-slate", char: "col-char" };
export const COLOUR_NAMES = { pink: "Pink", mint: "Mint", lav: "Lavender", sand: "Sand", slate: "Slate", char: "Charcoal" };
export const SWATCH = { pink: "#f08ca8", mint: "#7fe0b0", lav: "#b48fe0", sand: "#e9cfa0", slate: "#8fa4c4", char: "#4a3a4f" };

/**
 * Per slot, the anchor for the 1st, 2nd, 3rd… part of that slot, as % of the
 * sprite box. `a: "bottom"` plants the part's bottom edge on the point (hats,
 * horns, anything standing on the head); `a: "center"` centres it there.
 * z below 1 paints behind the body.
 */
export const ANCHORS = {
  horn: [{ x: 48, y: 21, w: 16, z: 5, a: "bottom" }, { x: 35, y: 25, w: 13, z: 5, a: "bottom", flip: true }, { x: 61, y: 25, w: 13, z: 5, a: "bottom" }],
  back: [{ x: 50, y: 22, w: 46, z: 0, a: "bottom" }],
  nub: [{ x: 30, y: 57, w: 12, z: 4, a: "center" }, { x: 70, y: 56, w: 12, z: 4, a: "center" }],
  wing: [{ x: 13, y: 66, w: 34, z: 0, a: "center", flip: true }, { x: 87, y: 60, w: 34, z: 0, a: "center" }],
  eye: [{ x: 31, y: 23, w: 12, z: 5, a: "bottom" }, { x: 66, y: 23, w: 12, z: 5, a: "bottom" }],
  antenna: [{ x: 51, y: 21, w: 16, z: 5, a: "bottom" }],
  hat: [{ x: 48, y: 25, w: 32, z: 6, a: "bottom" }],
  face: [{ x: 44, y: 38, w: 30, z: 6, a: "center" }],
  flower: [{ x: 66, y: 21, w: 14, z: 6, a: "center" }],
  held: [{ x: 36, y: 83, w: 17, z: 6, a: "center" }],
  neck: [{ x: 50, y: 57, w: 26, z: 5, a: "center" }],
  pack: [{ x: 71, y: 64, w: 26, z: 0, a: "center" }],
};

export const SLOT_NAMES = {
  horn: "Horns", back: "Back", nub: "Nubs", wing: "Wings", eye: "Extra eyes", antenna: "Antennae",
  hat: "Hat", face: "Face", flower: "Flower", held: "In hand", neck: "Neck", pack: "Back wear",
};

export const PART_NAMES = {
  "horn-00": "Curved horn", "horn-01": "Orange horn", "horn-02": "Lime horn", "horn-03": "Dark horn",
  "horn-04": "Spike ridge", "horn-05": "Orange spike ridge", "horn-06": "Lime spike ridge", "horn-07": "Dark spike ridge",
  "horn-08": "Tall spike", "horn-09": "Orange spike", "horn-10": "Lime spike", "horn-11": "Dark spike",
  "horn-12": "Grey nubs", "horn-13": "Orange warts", "horn-14": "Lime nubs", "horn-15": "Dark warts",
  "wing-00": "Bat wing", "wing-01": "Insect wing", "wing-02": "Purple bat wing", "wing-03": "Dragonfly wing",
  "wing-04": "Lime eye stalk", "wing-05": "Purple eye stalk", "wing-06": "Orange eye stalk", "wing-07": "Green eye stalk",
  "wing-08": "Lime antennae", "wing-09": "Curling tentacle", "wing-10": "Bobble antennae", "wing-11": "Lime tentacle",
  "wing-12": "Tiny crown", "wing-13": "Shark fin", "wing-14": "Mushroom cap", "wing-15": "Tuft of fur",
  "acc-00": "Party hat", "acc-01": "Bobble hat", "acc-02": "Wizard hat", "acc-03": "Flat cap",
  "acc-04": "Round spectacles", "acc-05": "Flower", "acc-06": "Bandana", "acc-07": "Headphones",
  "acc-08": "Tiny mug", "acc-09": "Lantern", "acc-10": "Little flag", "acc-11": "Magnifying glass",
  "acc-12": "Scarf", "acc-13": "Backpack", "acc-14": "Bow tie", "acc-15": "Cape",
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** One creature. `parts` are { id, slot } in the order they were earned/equipped. */
export function oddlerHTML(colour, parts, size = "", newId = null, label = "Your Oddler") {
  const used = {};
  const layers = [];
  for (const p of parts) {
    const list = ANCHORS[p.slot] || [];
    const i = used[p.slot] = (used[p.slot] ?? 0);
    used[p.slot] = i + 1;
    const a = list[i];
    if (!a) continue;
    const ty = a.a === "bottom" ? "-100%" : "-50%";
    const tf = `translate(-50%, ${ty})${a.flip ? " scaleX(-1)" : ""}`;
    layers.push(
      `<img class="part${p.id === newId ? " new" : ""}" src="/art/${esc(p.id)}.png" alt="" ` +
      `style="left:${a.x}%;top:${a.y}%;width:${a.w}%;z-index:${a.z};--tf:${tf};transform:${tf}">`,
    );
  }
  const idle = reduced ? "" : " idle";
  return `<div class="oddler ${size}${idle}" aria-label="${esc(label)} with ${parts.length} parts">` +
    `<img class="base" src="/art/${BASE[colour] || BASE.pink}.png" alt="">${layers.join("")}</div>`;
}
