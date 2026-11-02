# Ad kit — the build, not the output

`capture.mjs` drives the live site in headless Chrome at 432x768 / 5x and
screenshots real gameplay; `build.sh` turns those frames into the ad set with
ffmpeg. Both are kept here so the kit can always be rebuilt from scratch — the
rendered media is tens of megabytes and lives outside the repo.

Working copy and rendered output: `~/oddler-ads` (see POSTING-GUIDE.md there,
same file as the one beside this README). To set a kit folder up fresh:

```
mkdir -p ~/oddler-ads/{src,fonts,art}
cp oddler/marketing/{capture.mjs,build.sh} ~/oddler-ads/src/
ln -s ~/tommy/game-receipts/node_modules ~/oddler-ads/node_modules   # Playwright
# Fredoka from the v1 Google Fonts API (the v2 one only serves woff2):
curl -s "https://fonts.googleapis.com/css?family=Fredoka:700" | grep -o 'https://[^)]*\.ttf'
# art: curl oddler.app/art/{axo-base,axo-max,bg-grotto,logo}.png into art/
# answers.json: see "Rebuilding it" in POSTING-GUIDE.md
```

Nothing in the kit is mocked up. If an ad shows a screen, the game has that
screen — re-run the capture after a UI change and the ads follow the product.
