import manifest from "./walkthrough.json";

export const WALKTHROUGH = "/asset/walkthrough.mp4";
/**
 * The same film encoded backwards, so scrolling back can PLAY the footage in
 * reverse instead of seeking to it frame by frame. Frame k here is frame
 * (N-1-k) there: a time t on the walkthrough is `revDuration - t` on this.
 */
export const WALKTHROUGH_REV = "/asset/walkthrough-rev.mp4";
/**
 * The film's own first frame. A video that has never played paints black on
 * iOS, and iOS will not load one until a gesture asks it to — so without this
 * the opening screen is black behind the wordmark until the visitor scrolls.
 */
export const FIRST_FRAME = "/asset/first-frame.jpg";
export const DURATION = manifest.duration;

/**
 * Chapters are ranges on the single walkthrough timeline, not separate clips.
 *
 * Each entry names the source scene it belongs to; the real seconds come from
 * walkthrough.json, which the build script rewrites. Add a scene, re-run
 * `scripts/build-walkthrough.sh`, add a chapter here — nothing else moves.
 *
 * `head` / `tail` trim seconds off that scene's range, for when a scene starts
 * or ends on frames worth skipping.
 */
const spec = [
  {
    id: "interior",
    kind: "statement",
    scene: "Scene1.mp4",
    nav: "Interior design",
    eyebrow: "VYN Interior GmbH",
    title: "Interior design in the building:",
    lead: "Our goal is to put your interior design theory into practice and transform your property into a functional and aesthetically pleasing environment.",
    meta: "Zürich · Zug · Switzerland",
  },
  {
    id: "floor-coverings",
    no: "01",
    scene: "Scene2.mp4",
    nav: "Floor coverings",
    eyebrow: "Service 01",
    title: "Floor coverings",
    lead: "From the carpet tile to the solid country-house plank in European production. We choose the covering for its use, its acoustics and its upkeep.",
  },
  {
    id: "raised-floors",
    no: "02",
    scene: "Scene3.mp4",
    nav: "Raised floors",
    eyebrow: "Service 02",
    title: "Raised floors",
    lead: "Service levels for power, data and climate, out of sight beneath the usable surface. Layouts stay changeable without touching the shell.",
  },
  {
    id: "curtain-systems",
    no: "03",
    scene: "Scene4.mp4",
    nav: "Curtain systems",
    eyebrow: "Service 03",
    title: "Curtain systems",
    lead: "Privacy, room divider and acoustic absorber in one. Motorised tracks answer to daylight, time of day and occupancy.",
  },
  {
    id: "shading",
    no: "04",
    scene: "Scene5.mp4",
    nav: "Shading",
    eyebrow: "Service 04",
    title: "Shading",
    lead: "Glare-free work and a calm façade. Systems are matched to orientation, glazing and heat load — in summer as in winter.",
  },
  {
    id: "furniture",
    no: "05",
    scene: "Scene6.mp4",
    nav: "Furniture",
    eyebrow: "Service 05",
    title: "Furniture",
    lead: "From contemporary design to the antique single piece. We source, combine and reupholster so that stock and new purchase speak one language.",
  },
  {
    id: "acoustics",
    no: "06",
    scene: "Scene7.mp4",
    nav: "Acoustics",
    eyebrow: "Service 06",
    title: "Acoustics",
    lead: "Open floor plans need quiet. Absorption, reflection and screening are planned so that concentration and conversation can sit side by side.",
  },
  {
    id: "installation",
    no: "07",
    scene: "Scene8.mp4",
    nav: "Installation",
    eyebrow: "Service 07",
    title: "Installation service & professional assembly",
    lead: "Delivery, fitting and finish by our own crews. Measured on site, assembled in place and handed over clean.",
  },
  {
    id: "portfolio",
    kind: "portfolio",
    scene: "Scene9.mp4",
    nav: "Portfolio",
    eyebrow: "Portfolio",
    title: "Selected projects",
    meta: "Nine works",
  },
  {
    id: "about",
    kind: "values",
    scene: "Scene10.mp4",
    // Park a frame short of the cut. The print is measured against Scene 10's
    // last frame, and landing exactly on the boundary risks showing Scene 11's
    // first one instead — with the print still drawn where the old frame was.
    tail: 0.05,
    // The picture frame is wider than a portrait phone can show at full bleed,
    // so this beat pulls the camera back until the whole frame is in shot and
    // lets the film end above the copy rather than cropping the frame's sides.
    mobileCamera: {
      rect: { x: 863, y: 82, w: 552, h: 746 },
      box: { x: 0.1, y: 0, w: 0.8, h: 0.55 },
    },
    nav: "About",
    eyebrow: "About",
    title: "We stand up for our values.",
    name: "Elias Brunner",
    role: "Founder, VYN Interior",
    cta: "About",
  },
  {
    id: "contact",
    kind: "contact",
    scene: "Scene11.mp4",
    nav: "Contact",
    eyebrow: "Contact",
    title: "Let's talk about your project",
    lead: "The foundation of every successful construction or renovation project is solid planning. Tell us about your property before the first covering is ordered.",
  },
];

/**
 * Two frames of headroom before every cut. A chapter's range runs to where the
 * next one starts, so parking on that number parks on the FIRST frame of the
 * next scene — the flash at the end of every chapter. Playback can also run a
 * frame past the mark before the loop catches it; this absorbs both.
 */
const CUT = 2 / 24;

export const chapters = spec.map(({ scene, head = 0, tail = 0, ...rest }) => {
  const seg = manifest.segments.find((s) => s.file === scene);
  if (!seg) throw new Error(`No segment for ${scene}; re-run build-walkthrough.sh`);
  return {
    ...rest,
    from: seg.start + head,
    to: seg.start + seg.duration - Math.max(tail, CUT),
  };
});

/**
 * Beats are the moments a caption lands — and every one of them sits at the END
 * of a chapter's footage. The visitor scrolls once, that chapter plays through,
 * and its caption arrives with the last frame: you read about what you just
 * watched. The wordmark is the exception that opens the film, already on screen
 * before any input.
 *
 * One beat per chapter plus that wordmark, one gesture per beat — so a single
 * scroll plays exactly one scene, no more and no less.
 *
 * The rail lists chapters, so a beat carries the index of the chapter it
 * belongs to rather than an index of its own.
 */
const RAMP = 0.45;

/** Beats whose content is drawn onto the footage rather than laid over it. */
const PINNED = new Set(["portfolio", "values"]);

const marks = [
  { ...chapters[0], id: "intro-logo", kind: "logo", index: 0, at: 0 },
  ...chapters.map((chapter, index) => ({
    ...chapter,
    index,
    at: chapter.to,
    pinned: PINNED.has(chapter.kind),
  })),
];

export const beats = marks.map((beat, i) => ({
  ...beat,
  // Ramps reach back into the scene that just played and forward into the one
  // about to, but never far enough to touch the neighbouring beat.
  enter: Math.min(RAMP, (beat.at - (i > 0 ? marks[i - 1].at : 0)) * 0.35),
  exit: Math.min(RAMP, ((i + 1 < marks.length ? marks[i + 1].at : DURATION) - beat.at) * 0.35),
}));
