import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { dataDir } from "./db";
import { UserError } from "./util";

export const AVATAR_MAX_BYTES = 8 * 1024 * 1024;
const FORMATS = new Set(["jpeg", "png", "webp", "heif", "avif"]);
/** <userId>-<12 hex>.webp — nothing else is ever read from or written to the avatar directory. */
export const AVATAR_FILE = /^[a-z0-9_-]{1,80}-[a-f0-9]{12}\.webp$/i;

const dir = () => path.join(dataDir(), "uploads", "avatars");
export const avatarUrlFor = (file: string) => `/api/avatar/${file}`;
export const avatarFileFromUrl = (url: string | undefined) => (url?.startsWith("/api/avatar/") && AVATAR_FILE.test(url.slice(12)) ? url.slice(12) : null);

/** Center-crop to 512x512 WebP. sharp drops EXIF/ICC/XMP unless asked to keep it; rotate() bakes in orientation first. */
export async function processAvatar(input: Buffer): Promise<Buffer> {
  if (input.length === 0) throw new UserError("Choose an image first");
  if (input.length > AVATAR_MAX_BYTES) throw new UserError("Image is too large (max 8 MB)");
  try {
    const meta = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
    if (!meta.format || !FORMATS.has(meta.format)) throw new UserError("Use a JPG, PNG or WebP image");
    return await sharp(input, { limitInputPixels: 50_000_000 }).rotate().resize(512, 512, { fit: "cover", position: "centre" }).webp({ quality: 82 }).toBuffer();
  } catch (e) {
    if (e instanceof UserError) throw e;
    throw new UserError("We couldn’t read that image. Try a JPG, PNG or WebP.");
  }
}

export function saveAvatar(userId: string, webp: Buffer): string {
  const file = `${userId}-${createHash("sha256").update(webp).digest("hex").slice(0, 12)}.webp`;
  if (!AVATAR_FILE.test(file)) throw new UserError("Couldn’t save the image");
  fs.mkdirSync(dir(), { recursive: true });
  fs.writeFileSync(path.join(dir(), file), webp);
  return file;
}

export function readAvatar(file: string): Buffer | null {
  if (!AVATAR_FILE.test(file)) return null;
  try { return fs.readFileSync(path.join(dir(), file)); } catch { return null; }
}

export function removeAvatarFile(file: string | null | undefined) {
  if (!file || !AVATAR_FILE.test(file)) return;
  try { fs.unlinkSync(path.join(dir(), file)); } catch { /* already gone */ }
}
