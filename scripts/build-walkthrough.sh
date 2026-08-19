#!/usr/bin/env bash
# Builds the single continuous walkthrough the site scrubs.
#
# Why one file and not seven: playing seven clips back to back always reads as
# cuts, however carefully they are crossfaded. Concatenating first means the
# browser scrubs one uninterrupted timeline, so there is nothing to hide.
#
# ADDING A SCENE: drop Scene<N>.mp4 into public/asset/, add a line to SCENES
# below ("<file> <trim-start> <trim-duration>", seconds, 0 for none), re-run
# this script, then add the matching chapter to src/lib/chapters.js. The script
# rewrites src/lib/walkthrough.json with the real segment offsets.
set -euo pipefail

FFMPEG="${FFMPEG:-/x/Program Files/PySceneDetect/ffmpeg}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/asset"
# Kept inside the repo on purpose: this ffmpeg is a Windows build, and it
# resolves the MSYS /tmp prefix to a C:\tmp that does not exist.
WORK="$ROOT/.walkthrough-build"
rm -rf "$WORK"
mkdir -p "$WORK"
trap 'rm -rf "$WORK"' EXIT

# file            trim-start  trim-duration
SCENES=(
  "Scene1.mp4 0 0"
  "Scene2.mp4 0 0"
  "Scene3.mp4 0 0"
  "Scene4.mp4 0 0"
  "Scene5.mp4 0 0"
  "Scene6.mp4 0 0"
  "Scene7.mp4 0 0"
  "Scene8.mp4 0 0"
  "Scene9.mp4 0 0"
  "Scene10.mp4 0 0"
  "Scene11.mp4 0 0"
)

W=1600
H=900
# The renders carry an "Activate Windows" watermark across the bottom band.
# Cropping it away before the 16:9 fit is the only way it never reaches the page.
CROP_KEEP=0.90
VF="crop=iw:ih*${CROP_KEEP}:0:0,scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=24,setsar=1"

# `ffmpeg -i` with no output always exits non-zero, so it must not trip `set -e`.
# awk also normalises "03.04" into 3.040, which JSON will accept.
probe() {
  { "$FFMPEG" -i "$1" 2>&1 || true; } |
    sed -n 's/.*Duration: 00:00:\([0-9.]*\).*/\1/p' |
    awk '{printf "%.3f", $1}'
}

: > "$WORK/list.txt"
offsets=""
cursor=0

for entry in "${SCENES[@]}"; do
  read -r file ss dur_limit <<< "$entry"
  out="$WORK/${file%.mp4}.mp4"

  args=(-v error -y)
  [ "$ss" != "0" ] && args+=(-ss "$ss")
  args+=(-i "$SRC/$file")
  [ "$dur_limit" != "0" ] && args+=(-t "$dur_limit")

  "$FFMPEG" "${args[@]}" -an -vf "$VF" \
    -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p "$out"

  dur="$(probe "$out")"
  # Basenames only. MSYS rewrites paths passed as arguments but not paths read
  # from a file, so an absolute /x/... line here would resolve to X:/x/... —
  # hence the concat below runs from inside $WORK.
  echo "file '${file}'" >> "$WORK/list.txt"
  offsets="${offsets}{\"file\":\"${file}\",\"start\":${cursor},\"duration\":${dur}},"
  cursor="$(awk -v a="$cursor" -v b="$dur" 'BEGIN{printf "%.3f", a+b}')"
  echo "  ${file} -> ${dur}s"
done

# Keyframe every 6 frames — a quarter second. Denser than this (the -g 3 this
# started at) buys nothing the scrub can feel and costs a third of the bitrate,
# which phones pay for twice: once downloading, once parsing. CRF is unchanged,
# so every frame is encoded to the same quality either way.
(
  cd "$WORK"
  "$FFMPEG" -v error -y -f concat -safe 0 -i list.txt \
    -an -c:v libx264 -preset slow -crf 23 -g 6 -keyint_min 1 -sc_threshold 0 \
    -pix_fmt yuv420p -movflags +faststart "$SRC/walkthrough.mp4"
)

# The film's own first frame, as the video element's poster. A video that has
# never played paints black on iOS, and iOS will not load one until a gesture
# asks it to — so without this the opening screen is black until the first
# scroll. It has to be rebuilt with the film or it shows a frame that is gone.
"$FFMPEG" -v error -y -i "$SRC/walkthrough.mp4" -vf "select=eq(n\,0),scale=1280:-2" \
  -vsync 0 -frames:v 1 -q:v 5 "$SRC/first-frame.jpg"

total="$(probe "$SRC/walkthrough.mp4")"
printf '{\n  "duration": %s,\n  "segments": [%s]\n}\n' "$total" "${offsets%,}" \
  > "$ROOT/src/lib/walkthrough.json"

echo "walkthrough.mp4  ${total}s  $(du -h "$SRC/walkthrough.mp4" | cut -f1)"

# --- the same film, backwards -------------------------------------------------
#
# Scrolling back has to run the footage in reverse, and no decoder can do that:
# playing backwards means one seek per frame, each decoding from the keyframe
# before it, which is exactly the stutter this is here to remove. So the reverse
# is encoded once, and going back plays THIS file forwards — hardware decode,
# same as going forward. Frame k here is frame (N-1-k) there, so the player maps
# a time t to `revDuration - t`.
#
# Reversed in chunks: ffmpeg's `reverse` filter holds every frame it is given in
# memory, and the whole film at 1600x900 is over a gigabyte of raw frames. The
# chunks are cut by frame number, not seconds, so the join is exact, and they
# are concatenated last-first without re-encoding.
REV_STEP=100
frames="$("$FFMPEG" -v error -stats -i "$SRC/walkthrough.mp4" -map 0:v -c copy -f null - 2>&1 \
  | grep -o 'frame= *[0-9]*' | tail -1 | grep -o '[0-9]*')"
frames="${frames:-0}"
[ "$frames" -gt 0 ] || { echo "could not count frames"; exit 1; }

rm -f "$WORK/revlist.txt"
: > "$WORK/revlist.txt"
a=0
parts=()
while [ "$a" -lt "$frames" ]; do
  b=$(( a + REV_STEP )); [ "$b" -gt "$frames" ] && b="$frames"
  "$FFMPEG" -v error -y -i "$SRC/walkthrough.mp4" -an \
    -vf "trim=start_frame=${a}:end_frame=${b},setpts=PTS-STARTPTS,reverse" \
    -c:v libx264 -preset slow -crf 23 -g 6 -keyint_min 1 -sc_threshold 0 \
    -pix_fmt yuv420p "$WORK/rev_${a}.mp4"
  parts=("rev_${a}.mp4" "${parts[@]}")
  a="$b"
done
for p in "${parts[@]}"; do echo "file '${p}'" >> "$WORK/revlist.txt"; done

(
  cd "$WORK"
  "$FFMPEG" -v error -y -f concat -safe 0 -i revlist.txt \
    -an -c copy -movflags +faststart "$SRC/walkthrough-rev.mp4"
)

echo "walkthrough-rev.mp4  $(probe "$SRC/walkthrough-rev.mp4")s  $(du -h "$SRC/walkthrough-rev.mp4" | cut -f1)"
