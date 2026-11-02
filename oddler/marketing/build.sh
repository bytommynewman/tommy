#!/usr/bin/env bash
# Build the Oddler ad set from captured frames.
#   src/capture.mjs && src/capture.mjs duo && src/build.sh
# Masters are 2160x3840. Type is Fredoka, the game's own display font, so the
# captions match the product. Captions never sit over the UI: the phone frame
# takes the top 86% and the text lives in the band underneath.
set -euo pipefail
cd "$(dirname "$0")/.."
BOLD="fonts/Fredoka-700.ttf"
MED="fonts/Fredoka-600.ttf"
BG=0x1a0f26
LIME=0xBFF747
V4K=out/1-vertical-4k-tiktok-reels-shorts
V1080=out/2-vertical-1080-smaller
SQ=out/3-square-feeds
WIDE=out/4-landscape-youtube
mkdir -p "$V4K" "$V1080" "$SQ" "$WIDE" posters
STAGE="fps=30,scale=2160:3840:force_original_aspect_ratio=decrease,scale=iw*0.86:ih*0.86,pad=2160:3840:(ow-iw)/2:48:color=$BG"
FULL="fps=30,scale=2160:3840:force_original_aspect_ratio=decrease,pad=2160:3840:(ow-iw)/2:0:color=$BG"
# text, font, colour, size, from, to
cap() { printf "drawtext=fontfile='%s':text='%s':fontcolor=%s:fontsize=%s:x=(w-text_w)/2:y=3455:box=1:boxcolor=%s@0.94:boxborderw=46:enable='between(t,%s,%s)'" "$2" "$1" "$3" "$4" "$BG" "$5" "$6"; }
render() { ffmpeg -hide_banner -loglevel error -f concat -safe 0 -i "$1" -vf "${4:-$STAGE},$2" \
    -c:v libx264 -pix_fmt yuv420p -preset slow -crf 18 -movflags +faststart -y "$V4K/$3"; echo "built $V4K/$3"; }
# frames are NNN-<label>.png, so match the label exactly
f() { ls frames/*-"$1".png | head -1; }
d() { ls frames-duo/*-"$1".png | head -1; }

# ── 01 · how to play ───────────────────────────────────────────────────────
{ echo "file '$(f round-empty)'"; echo "duration 2.2"
  for t in frames/*round-typing-*.png; do echo "file '$t'"; echo "duration 0.30"; done
  echo "file '$(f round-reveal)'"; echo "duration 2.8"
  echo "file '$(f round-reveal-part)'"; echo "duration 2.0"
  echo "file '$(f run-done)'";    echo "duration 2.5"
  echo "file '$(f home-top)'";        echo "duration 2.6"
  echo "file '$(f home-top)'"; } > .c1
TYPE_END=$(python3 -c "import glob;print(round(2.2+0.30*len(glob.glob('frames/*round-typing-*.png')),2))")
F="$(cap 'Only uncommon answers score' "$BOLD" $LIME 112 0.2 2.2),"
F="$F$(cap 'Everyone types the obvious one' "$MED" white 96 2.3 $TYPE_END),"
F="$F$(cap 'Obvious = 10 pts. Deep cut = 100.' "$BOLD" $LIME 104 $(python3 -c "print($TYPE_END+0.2)") $(python3 -c "print($TYPE_END+2.7)")),"
F="$F$(cap 'Rare answers grow your Oddler' "$MED" white 98 $(python3 -c "print($TYPE_END+2.9)") $(python3 -c "print($TYPE_END+4.7)")),"
F="$F$(cap 'Seven prompts. Twenty seconds each.' "$MED" white 92 $(python3 -c "print($TYPE_END+4.9)") $(python3 -c "print($TYPE_END+7.2)")),"
F="$F$(cap 'oddler.app' "$BOLD" $LIME 180 $(python3 -c "print($TYPE_END+7.4)") $(python3 -c "print($TYPE_END+10)"))"
render .c1 "$F" 01-how-to-play-4k-9x16.mp4

# ── 02 · what is Oddler (the hook) ─────────────────────────────────────────
{ echo "file '$(f howitworks-ladder)'"; echo "duration 3.6"
  echo "file '$(f round-empty)'";       echo "duration 1.8"
  echo "file '$(ls frames/*round-typing-*.png | tail -1)'"; echo "duration 1.0"
  echo "file '$(f round-reveal)'";  echo "duration 2.6"
  echo "file '$(f run-done)'";      echo "duration 2.4"
  echo "file '$(f home-top)'";          echo "duration 2.6"
  echo "file '$(f home-top)'"; } > .c2
F="$(cap 'France scores 10. Liechtenstein scores 100.' "$BOLD" $LIME 88 0.2 3.5),"
F="$F$(cap 'The obvious answer is the wrong one' "$MED" white 94 3.7 5.3),"
F="$F$(cap 'Dig deeper, score higher' "$BOLD" $LIME 108 5.4 6.4),"
F="$F$(cap 'The rarer it is, the more it pays' "$BOLD" $LIME 100 6.5 9.0),"
F="$F$(cap 'Seven prompts a run' "$MED" white 100 9.2 11.4),"
F="$F$(cap 'oddler.app' "$BOLD" $LIME 180 11.6 14.0)"
render .c2 "$F" 02-what-is-oddler-4k-9x16.mp4

# ── 03 · the Daily ─────────────────────────────────────────────────────────
{ echo "file '$(d daily-card)'";    echo "duration 2.6"
  echo "file '$(d daily-round)'";   echo "duration 2.6"
  echo "file '$(d daily-results)'"; echo "duration 2.8"
  echo "file '$(d daily-grid)'";    echo "duration 3.2"
  echo "file '$(d daily-grid)'"; } > .c3
F="$(cap 'One Daily. Same seven for everyone.' "$BOLD" $LIME 100 0.2 2.5),"
F="$F$(cap 'You get one go. Resets at midnight.' "$MED" white 94 2.7 5.1),"
F="$F$(cap 'Then you get a grid to share' "$MED" white 98 5.3 7.9),"
F="$F$(cap 'Post it. Make them beat it.' "$BOLD" $LIME 108 8.1 11.2)"
render .c3 "$F" 03-daily-4k-9x16.mp4

# ── 04 · Duo — stacked two-up so both phones fill the frame, played out ───
python3 src/stack-duo.py >/dev/null
s() { ls frames-duo-stacked/*"$1"*.png | head -1; }
{ echo "file '$(s lobby)'";            echo "duration 2.4"
  echo "file '$(s r1-onclock)'";       echo "duration 2.0"
  echo "file '$(s r1-typing)'";        echo "duration 2.2"
  echo "file '$(s r1-scored)'";        echo "duration 2.4"
  echo "file '$(s r2-onclock)'";       echo "duration 1.8"
  echo "file '$(s r2-typing)'";        echo "duration 1.8"
  echo "file '$(s r2-scored)'";        echo "duration 2.2"
  echo "file '$(s r5-scored)'";        echo "duration 2.8"
  echo "file '$(s r5-scored)'"; } > .c4
F="$(cap 'Send a friend the room code' "$BOLD" $LIME 104 0.2 2.3),"
F="$F$(cap 'Ten prompts. You take turns.' "$MED" white 98 2.5 4.3),"
F="$F$(cap 'They watch you type, live' "$MED" white 98 4.5 6.5),"
F="$F$(cap 'Their answer, your score' "$BOLD" $LIME 100 6.7 8.9),"
F="$F$(cap 'Now it is their go' "$MED" white 98 9.1 12.5),"
F="$F$(cap 'One team score. No hiding.' "$BOLD" $LIME 108 12.7 17.4)"
render .c4 "$F" 04-duo-4k-9x16.mp4 "$FULL"

# ── 05 · the locker ────────────────────────────────────────────────────────
{ echo "file '$(f round-reveal-part)'"; echo "duration 2.8"
  echo "file '$(f round-mid)'";         echo "duration 1.8"
  # the locker, scrolled: every slot and everything there is to earn
  for t in frames-locker/scroll-0[0-3]*.png; do echo "file '$t'"; echo "duration 0.0667"; done
  echo "file '$(f run-done-scroll)'";   echo "duration 2.2"
  echo "file '$(f home-top)'";          echo "duration 2.6"
  echo "file '$(f home-top)'"; } > .c5
SCROLL_END=$(python3 -c "import glob;print(round(4.6+0.0667*len(glob.glob('frames-locker/scroll-0[0-3]*.png')),2))")
F="$(cap 'Land a rare answer, grow a part' "$BOLD" $LIME 104 0.2 2.7),"
F="$F$(cap 'Horns. Wings. Glasses.' "$MED" white 104 2.9 4.5),"
F="$F$(cap 'Fifty-four parts to hunt down' "$BOLD" $LIME 100 4.7 $SCROLL_END),"
F="$F$(cap 'Your Oddler keeps what you earn' "$MED" white 94 $(python3 -c "print($SCROLL_END+0.2)") $(python3 -c "print($SCROLL_END+2.3)")),"
F="$F$(cap 'oddler.app' "$BOLD" $LIME 180 $(python3 -c "print($SCROLL_END+2.5)") $(python3 -c "print($SCROLL_END+5.2)"))"
render .c5 "$F" 05-collect-4k-9x16.mp4

# ── 02b · the hook, fronted by the animated sting ──────────────────────────
if [ -f sting-raw.mp4 ]; then
  ffmpeg -hide_banner -loglevel error -ss 0 -t 2.2 -i sting-raw.mp4 -i art/logo.png -filter_complex \
    "[0:v]scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,fps=30[v];[1:v]scale=1520:-1[lg];[v][lg]overlay=(W-w)/2:500,drawtext=fontfile='$BOLD':text='Only uncommon answers score':fontcolor=$LIME:fontsize=104:x=(w-text_w)/2:y=3455:box=1:boxcolor=$BG@0.94:boxborderw=46,fade=t=out:st=1.9:d=0.3" \
    -an -c:v libx264 -pix_fmt yuv420p -preset slow -crf 18 -y out/.opener.mp4
  ffmpeg -hide_banner -loglevel error -i out/.opener.mp4 -i "$V4K/02-what-is-oddler-4k-9x16.mp4" \
    -filter_complex "[0:v][1:v]concat=n=2:v=1[v]" -map "[v]" -c:v libx264 -pix_fmt yuv420p -preset slow -crf 18 -movflags +faststart -y "$V4K/02b-hook-with-opener-4k-9x16.mp4"
  echo "built $V4K/02b-hook-with-opener-4k-9x16.mp4"
fi

# ── delivery formats, all derived from the 4K master ───────────────────────
for v in "$V4K"/*-4k-9x16.mp4; do
  b=$(basename "$v" -4k-9x16.mp4)
  ffmpeg -hide_banner -loglevel error -i "$v" -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -pix_fmt yuv420p -preset slow -crf 19 -movflags +faststart -y "$V1080/$b-1080-9x16.mp4"
  ffmpeg -hide_banner -loglevel error -i "$v" -vf "scale=2160:2160:force_original_aspect_ratio=decrease:flags=lanczos,pad=2160:2160:(ow-iw)/2:(oh-ih)/2:color=$BG" -c:v libx264 -pix_fmt yuv420p -preset slow -crf 19 -movflags +faststart -y "$SQ/$b-4k-1x1.mp4"
  ffmpeg -hide_banner -loglevel error -i "$v" -filter_complex "[0:v]scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,gblur=sigma=60,eq=brightness=-0.18[bg];[0:v]scale=-1:2160:flags=lanczos[fg];[bg][fg]overlay=(W-w)/2:0" -c:v libx264 -pix_fmt yuv420p -preset slow -crf 19 -movflags +faststart -y "$WIDE/$b-4k-16x9.mp4"
done
# a note in each folder so the right cut is obvious in Finder
printf '2160x3840 — the masters. Best quality, use these by default.\nTikTok, Instagram Reels, YouTube Shorts, Stories.\n' > "$V4K/_README.txt"
printf '1080x1920 — the same ads, downscaled from the 4K masters.\nOnly needed where 4K vertical is rejected or uploads too slowly.\n' > "$V1080/_README.txt"
printf '2160x2160 square. Instagram and Facebook feed posts, X.\n' > "$SQ/_README.txt"
printf '3840x2160 landscape. YouTube, X, Facebook, Reddit.\n' > "$WIDE/_README.txt"

# ── stills: a 4:5 carousel and a 16:9 link card ────────────────────────────
poster() { ffmpeg -hide_banner -loglevel error -i "$1" -vf \
"scale=2160:2700:force_original_aspect_ratio=decrease,scale=iw*0.88:ih*0.88,pad=2160:2700:(ow-iw)/2:40:color=$BG,drawtext=fontfile='$2':text='$3':fontcolor=$4:fontsize=$5:x=(w-text_w)/2:y=2420:box=1:boxcolor=$BG@0.94:boxborderw=44" \
 -frames:v 1 -y "posters/$6"; }
poster "$(f howitworks-ladder)" "$BOLD" 'Only uncommon answers score'   $LIME 108 carousel-1.png
poster "$(f round-empty)"       "$MED"  'Twenty seconds. One prompt.'   white 104 carousel-2.png
poster "$(f round-reveal)"  "$BOLD" 'Obvious = 10. Deep cut = 100.' $LIME 104 carousel-3.png
poster "$(f round-reveal-part)" "$MED"  'Rare answers grow your Oddler' white 100 carousel-4.png
poster "$(d daily-grid)"        "$MED"  'A Daily grid worth posting'    white 100 carousel-5.png
poster "$(f home-top)"          "$BOLD" 'oddler.app'                    $LIME 180 carousel-6.png
ffmpeg -hide_banner -loglevel error -i "$(f round-reveal)" -i art/logo.png -filter_complex \
"color=$BG:3840x2160[bg];[0:v]scale=-1:2060:flags=lanczos[p];[bg][p]overlay=220:50[s];[1:v]scale=1500:-1:flags=lanczos[lg];[s][lg]overlay=W-w-220:380" \
-frames:v 1 -y posters/link-card-4k-16x9.png
rm -f .c1 .c2 .c3 .c4 .c5 out/.opener.mp4
echo "done — $(ls out/*/*.mp4 | wc -l | tr -d ' ') videos, $(ls posters/*.png | wc -l | tr -d ' ') stills"
