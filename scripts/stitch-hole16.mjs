// One-time build script: fetches Esri World Imagery tiles of TPC Sawgrass
// hole 16, stitches them, rotates/crops to a portrait framing (tee at the
// bottom, green at the top), and writes assets/hole16.webp.
// Run: node scripts/stitch-hole16.mjs
// Iterate: inspect scripts/hole16-rotated.png, adjust CONFIG, re-run.
import sharp from 'sharp';
import https from 'node:https';

// Node's global fetch (undici) intermittently gets a CloudFront-origin 503
// from this tile server on the last tile of a run; the plain `https` module
// does not. Fetch tile bytes via https.get instead of fetch() to avoid it.
function fetchTile(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

const CONFIG = {
  zoom: 19,
  // Bbox around TPC Sawgrass hole 16 (par 5), verified against OpenStreetMap
  // golf-course tagging (way ref=16, golf=tee/fairway/green) rather than
  // guesswork: tee centroid (30.1981,-81.39184), green bounds
  // lat 30.19425-30.19456 / lon -81.38982..-81.38954. Hole 17's green
  // (island green, bounds lat 30.19367-30.19463 / lon -81.39087..-81.39018)
  // sits immediately east/adjacent to 16's green on the same lake.
  latMin: 30.1905,
  latMax: 30.2005,
  lonMin: -81.3965,
  lonMax: -81.3860,
  // Degrees clockwise (sharp .rotate(deg) semantics: clockwise-positive,
  // expands canvas). Derived analytically from the tee->green vector in
  // pre-rotation pixel space and verified empirically (see task-3-report.md
  // "Rotation fix" section): with this value the tee->green chord is
  // vertical post-rotation (horizontal offset ~1px), green above tee.
  rotateDeg: 206.5603251765414,
  // Portrait crop (aspect 1:1.913, within the 1:1.8-1:2.7 range) framing
  // the full hole: tee near the bottom (small rough margin below), green
  // near the top (small margin beyond), full fairway/dogleg corridor, and
  // a comfortable strip of the 16/17 lake on the right. Derived from the
  // authoritative OSM tee/green centroids transformed through the same
  // rotation sharp applies (see task-3-report.md "Rotation fix" section).
  crop: { left: 2250, top: 2079, width: 1300, height: 2487 },
  outWidth: 1200,
};

const TILE = 256;
const tileUrl = (z, x, y) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

const lonToX = (lon, z) => ((lon + 180) / 360) * 2 ** z;
const latToY = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};

async function main() {
  const { zoom, latMin, latMax, lonMin, lonMax } = CONFIG;
  const x0 = Math.floor(lonToX(lonMin, zoom));
  const x1 = Math.floor(lonToX(lonMax, zoom));
  const y0 = Math.floor(latToY(latMax, zoom)); // note: y grows southward
  const y1 = Math.floor(latToY(latMin, zoom));
  const cols = x1 - x0 + 1;
  const rows = y1 - y0 + 1;
  console.log(`Fetching ${cols}x${rows} = ${cols * rows} tiles at z${zoom}...`);

  const composites = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      let bytes;
      let lastErr;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          bytes = await fetchTile(tileUrl(zoom, x, y));
          break;
        } catch (e) {
          lastErr = e;
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        }
      }
      if (!bytes) throw new Error(`tile ${x},${y}: ${lastErr?.message}`);
      composites.push({
        input: bytes,
        left: (x - x0) * TILE,
        top: (y - y0) * TILE,
      });
    }
  }

  let buf = await sharp({
    create: { width: cols * TILE, height: rows * TILE, channels: 3, background: '#000' },
  })
    .composite(composites)
    .png()
    .toBuffer();

  if (CONFIG.rotateDeg) {
    buf = await sharp(buf).rotate(CONFIG.rotateDeg, { background: '#000' }).toBuffer();
  }
  await sharp(buf).png().toFile('scripts/hole16-rotated.png');
  console.log('Inspection image: scripts/hole16-rotated.png');

  if (!CONFIG.crop) {
    console.log('CONFIG.crop not set — inspect the PNG, set rotateDeg/crop, re-run.');
    return;
  }
  buf = await sharp(buf).extract(CONFIG.crop).toBuffer();
  const info = await sharp(buf)
    .resize({ width: CONFIG.outWidth })
    .webp({ quality: 82 })
    .toFile('assets/hole16.webp');
  console.log(`assets/hole16.webp: ${info.width}x${info.height} (${Math.round(info.size / 1024)} KB)`);
  console.log('>>> Copy these dimensions into SCENE in constants/hole.ts');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
