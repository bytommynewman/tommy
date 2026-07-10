import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
import { Skia, type SkImage } from '@shopify/react-native-skia';
import { HOLE_IMAGE } from '../constants/hole';

// The aerial photo decodes to ~28MB of texture. useImage() re-decoded it on
// every course mount; leaving hq -> course -> hq -> course could silently
// fail the decode under memory pressure, stranding the screen on the green
// fallback. Decode ONCE per app launch and hand every mount the same SkImage.
let cached: SkImage | null = null;
let inflight: Promise<SkImage | null> | null = null;

async function load(): Promise<SkImage | null> {
  try {
    const asset = Asset.fromModule(HOLE_IMAGE);
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    const data = await Skia.Data.fromURI(uri);
    cached = Skia.Image.MakeImageFromEncoded(data);
    return cached;
  } catch (err) {
    console.warn('hole image decode failed', err);
    inflight = null; // allow a retry on the next mount
    return null;
  }
}

export function useHoleImage(): SkImage | null {
  const [image, setImage] = useState<SkImage | null>(cached);

  useEffect(() => {
    if (cached) return;
    if (!inflight) inflight = load();
    let alive = true;
    inflight.then((img) => {
      if (alive) setImage(img);
    });
    return () => {
      alive = false;
    };
  }, []);

  return image;
}
