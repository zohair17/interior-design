"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { clamp, smoothstep } from "@/lib/math";
import { beats, chapters, DURATION, WALKTHROUGH } from "@/lib/chapters";
import { FILM, useFilmBox, useIsNarrow } from "@/lib/film";
import SiteHeader from "@/components/SiteHeader";
import PortfolioWall from "@/components/PortfolioWall";
import ValuesCard from "@/components/ValuesCard";
import ContactForm from "@/components/ContactForm";

const N = chapters.length;
const LAST = beats.length - 1;
/** Milliseconds of transition per second of footage crossed. */
const PACE = 620;
const MIN_GLIDE = 700;
const MAX_GLIDE = 2200;
/** Quiet time, in ms, before the next gesture is accepted. */
const GESTURE_GAP = 160;
/** Wheel deltas below this are trackpad settle, not intent. */
const WHEEL_MIN = 4;
/** Swipe distance, in px, that counts as one gesture. */
const SWIPE = 48;
const FRAME = 1 / 24;
/**
 * Playback rates a forward glide may use instead of seeking frame by frame.
 * Outside this band — a tiny nudge, or a jump across the whole film from the
 * rail — seeking is still the better tool.
 */
const PLAY_MIN = 0.25;
const PLAY_MAX = 3;

/** Where each beat parks the playhead: on its own landing point. */
const LAND = beats.map((beat) => clamp(beat.at / DURATION, 0, 1));

/** Sine ease: the scene starts and stops gently, plays at pace in between. */
const ease = (k) => 0.5 - Math.cos(Math.PI * k) / 2;

/**
 * Copy opacity for a beat, given the playhead in seconds.
 *
 * Every caption peaks exactly where the scroll parks — the last frame of its
 * chapter — and falls away on both sides, so the footage in between plays with
 * nothing over it. The wordmark opens lit and the contact card stays lit;
 * neither has footage on its far side to make room for.
 */
function copyAt(beat, t, isFirst, isLast) {
  const inA = isFirst ? 1 : smoothstep(beat.at - beat.enter, beat.at, t);
  const outA = isLast ? 1 : 1 - smoothstep(beat.at, beat.at + beat.exit, t);

  const o = Math.min(inA, outA);
  // Arriving copy rises into place; departing copy keeps rising out of it, so
  // the two are never stacked in the same spot. Anything pinned to the footage
  // stays put: a print hanging in a frame cannot drift out of it.
  const dy = beat.pinned ? 0 : inA < outA ? (1 - o) * 26 : -(1 - o) * 26;
  return { o, dy };
}

export default function Walkthrough() {
  const [active, setActive] = useState(0);
  /** The beat the film has actually come to rest on; drives the entrances. */
  const [arrived, setArrived] = useState(0);

  // One camera for the video and for everything pinned to it, so a frame drawn
  // on the wall stays on the wall whatever the viewport does.
  const narrow = useIsNarrow();
  const camera = narrow ? chapters[active].mobileCamera : undefined;
  const box = useFilmBox(camera);

  const videoRef = useRef(null);
  const copies = useRef([]);
  const shown = useRef([]);
  const playing = useRef(false);
  const barRef = useRef(null);
  const prog = useRef(0);
  const raf = useRef(0);
  const seeking = useRef(false);
  /** Which beat the film is parked on, or gliding towards. */
  const cursor = useRef(0);
  const settled = useRef(0);
  const locked = useRef(false);
  const lastInput = useRef(0);
  const tween = useRef({ from: 0, to: 0, start: 0, dur: 0 });

  const paint = useCallback(function frame() {
    raf.current = 0;

    const now = performance.now();
    const tw = tween.current;
    const k = tw.dur > 0 ? clamp((now - tw.start) / tw.dur, 0, 1) : 1;
    // A played scene advances at a constant rate, so the captions and the
    // progress bar must too, or the copy would run ahead of the footage in the
    // middle of the glide. A scrubbed one is free to ease.
    const eased = tw.linear ? k : ease(k);
    prog.current = tw.dur > 0 ? tw.from + (tw.to - tw.from) * eased : tw.to;
    const p = prog.current;
    const t = p * DURATION;
    const moving = k < 1;

    for (let i = 0; i <= LAST; i += 1) {
      const el = copies.current[i];
      if (!el) continue;
      const { o, dy } = copyAt(beats[i], t, i === 0, i === LAST);
      const show = o > 0.004;
      if (shown.current[i] !== show) {
        shown.current[i] = show;
        el.style.visibility = show ? "visible" : "hidden";
        // Only the layer actually on screen earns a compositor layer. Twelve
        // promoted full-screen layers is memory a phone would rather spend on
        // decoding the film.
        el.style.willChange = show ? "opacity, transform" : "auto";
      }
      if (show) {
        el.style.opacity = o;
        el.style.transform = `translate3d(0, ${dy.toFixed(1)}px, 0)`;
      }
    }

    if (barRef.current) barRef.current.style.transform = `scaleX(${p.toFixed(4)})`;

    const video = videoRef.current;
    let waiting = false;
    if (video && playing.current) {
      // The decoder is running the scene itself; leave it alone until the glide
      // is over, then stop it exactly on the beat's frame.
      if (!moving) {
        playing.current = false;
        video.pause();
        video.currentTime = clamp(t, 0, (video.duration || DURATION) - FRAME);
      }
    } else if (video && !seeking.current) {
      if (video.readyState < 1) {
        waiting = true;
      } else {
        const want = clamp(t, 0, (video.duration || DURATION) - FRAME);
        if (Math.abs(video.currentTime - want) >= FRAME * 0.5) {
          seeking.current = true;
          video.currentTime = want;
        }
      }
    }

    // Framed content waits for the film to stop before it animates in, so the
    // wall is never assembling itself while the camera is still moving.
    if (!moving && settled.current !== cursor.current) {
      settled.current = cursor.current;
      setArrived(cursor.current);
    }

    // One flick of a trackpad fires dozens of wheel events. The lock holds until
    // the scene has finished playing AND the wheel has gone quiet, so that flick
    // advances one scene rather than five.
    if (locked.current && !moving && now - lastInput.current > GESTURE_GAP) {
      locked.current = false;
    }

    if (moving || waiting || locked.current) raf.current = requestAnimationFrame(frame);
  }, []);

  const schedule = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(paint);
  }, [paint]);

  /** Plays the footage between here and beat `n`, then parks on its caption. */
  const glide = useCallback(
    (n) => {
      const to = LAND[n];
      const from = prog.current;
      const crossed = Math.abs(to - from) * DURATION;
      // Reduced motion gets the destination without the ride.
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const dur = still || crossed < 0.01 ? 0 : clamp(crossed * PACE, MIN_GLIDE, MAX_GLIDE);

      // Play the scene rather than seeking through it. Sequential decode is
      // what video hardware is built for; a seek per animation frame is what
      // made this stutter on phones. Only forward, only at a sane rate — the
      // rest still scrubs, and either way the beat lands on the same frame.
      const video = videoRef.current;
      const rate = dur > 0 ? crossed / (dur / 1000) : 0;
      const canPlay =
        video && to > from && dur > 0 && rate >= PLAY_MIN && rate <= PLAY_MAX && video.readyState >= 2;

      tween.current = { from, to, start: performance.now(), dur, linear: canPlay };

      if (canPlay) {
        video.playbackRate = rate;
        playing.current = true;
        Promise.resolve(video.play()).catch(() => {
          playing.current = false;
        });
      } else if (video) {
        playing.current = false;
        if (!video.paused) video.pause();
      }

      cursor.current = n;
      setActive(beats[n].index);
      // Nothing is pinned to the footage while the footage is moving: the wall
      // the print hangs on is about to leave the shot.
      setArrived(-1);
      schedule();
    },
    [schedule],
  );

  const go = useCallback(
    (dir) => {
      const n = clamp(cursor.current + dir, 0, LAST);
      // At either end there is nothing to play, so the gesture takes no lock.
      if (n === cursor.current) return false;
      glide(n);
      return true;
    },
    [glide],
  );

  /** Rail and menu jump by chapter; a chapter's first beat is its landing. */
  const jumpTo = useCallback(
    (i) => {
      glide(beats.findIndex((b) => b.index === i));
    },
    [glide],
  );

  useEffect(() => {
    const video = videoRef.current;
    // The film is scrubbed, never played.
    const onSeeked = () => {
      seeking.current = false;
      schedule();
    };
    video?.addEventListener("seeked", onSeeked);
    video?.addEventListener("loadedmetadata", onSeeked);
    schedule();

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const gesture = (dir) => {
      lastInput.current = performance.now();
      if (locked.current) return;
      locked.current = go(dir);
    };

    const typing = (el) => el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);

    const panelAt = (target) => {
      const panel = target?.closest?.(".contact-layout");
      return panel && panel.scrollHeight > panel.clientHeight + 2 ? panel : null;
    };

    // The contact panel keeps a gesture only while it still has room to move
    // that way. Owning every gesture on sight is what stranded the last beat:
    // with the form parked at its top edge an upward scroll scrolled nothing
    // and never reached the deck, so there was no way back to About.
    const room = (panel, dir) =>
      dir > 0
        ? panel.scrollTop < panel.scrollHeight - panel.clientHeight - 1
        : panel.scrollTop > 1;

    const scrolls = (target, dir) => {
      const panel = panelAt(target);
      return !!panel && room(panel, dir);
    };

    const onWheel = (e) => {
      if (scrolls(e.target, e.deltaY > 0 ? 1 : -1)) return;
      e.preventDefault();
      if (Math.abs(e.deltaY) < WHEEL_MIN) return;
      gesture(e.deltaY > 0 ? 1 : -1);
    };
    const onKey = (e) => {
      if (typing(e.target)) return;
      if (e.key === "Home") return jumpTo(0);
      if (e.key === "End") return jumpTo(N - 1);
      const fwd = ["ArrowDown", "PageDown", " ", "ArrowRight"].includes(e.key);
      const back = ["ArrowUp", "PageUp", "ArrowLeft"].includes(e.key);
      if (!fwd && !back) return;
      e.preventDefault();
      gesture(fwd ? 1 : -1);
    };

    let touchY = null;
    let touchPanel = null;
    const onTouchStart = (e) => {
      touchY = e.touches[0].clientY;
      // Which way the finger will go is not known yet, so remember the panel
      // and decide once the move has a direction.
      touchPanel = panelAt(e.target);
    };
    const onTouchMove = (e) => {
      if (touchY === null) return;
      const dy = touchY - e.touches[0].clientY;
      if (Math.abs(dy) < SWIPE) return;
      const dir = dy > 0 ? 1 : -1;
      if (touchPanel && room(touchPanel, dir)) return;
      // One swipe moves one scene, however far the finger keeps travelling.
      touchY = null;
      gesture(dir);
    };
    const onTouchEnd = () => {
      touchY = null;
      touchPanel = null;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.body.style.overflow = prev;
      // Clearing the handle matters as much as cancelling it: `schedule()` uses
      // `raf.current` as its "already queued" flag, so a stale non-zero id left
      // behind here makes every later schedule a no-op and the scrub dies. That
      // is exactly what StrictMode's mount/unmount/mount does in development.
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = 0;
      video?.removeEventListener("seeked", onSeeked);
      video?.removeEventListener("loadedmetadata", onSeeked);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [go, jumpTo, schedule]);

  return (
    <div className="deck">
      <SiteHeader index={active} onNav={jumpTo} />

      <div className="slide-media">
        <video
          ref={videoRef}
          src={WALKTHROUGH}
          muted
          playsInline
          preload="auto"
          // Without a camera the stylesheet's full-bleed fit is already right,
          // and leaving it to CSS means the first paint needs no measurement.
          style={
            camera
              ? {
                  left: box.x,
                  top: box.y,
                  right: "auto",
                  bottom: "auto",
                  width: FILM.w * box.scale,
                  height: FILM.h * box.scale,
                }
              : undefined
          }
        />
      </div>
      <div className="slide-grade" />

      {beats.map((beat, i) => {
        const { o, dy } = copyAt(beat, 0, i === 0, i === LAST);
        return (
          <article
            key={beat.id}
            ref={(el) => {
              copies.current[i] = el;
            }}
            className="slide-copy-layer"
            style={{
              visibility: o > 0.004 ? "visible" : "hidden",
              opacity: o,
              transform: `translate3d(0, ${dy.toFixed(1)}px, 0)`,
            }}
          >
            {beat.kind === "logo" ? (
              <LogoCard chapter={beat} />
            ) : beat.kind === "statement" ? (
              <StatementCopy chapter={beat} />
            ) : beat.kind === "portfolio" ? (
              <PortfolioWall chapter={beat} show={arrived === i} box={box} narrow={narrow} />
            ) : beat.kind === "values" ? (
              <ValuesCard chapter={beat} show={arrived === i} box={box} narrow={narrow} />
            ) : beat.kind === "contact" ? (
              <ContactForm chapter={beat} />
            ) : (
              <ServiceCopy chapter={beat} />
            )}
          </article>
        );
      })}

      <nav aria-label="Chapters" className="deck-rail">
        <ul>
          {chapters.map((chapter, i) => (
            <li key={chapter.id}>
              <button
                type="button"
                onClick={() => jumpTo(i)}
                aria-current={i === active ? "true" : undefined}
                aria-label={chapter.nav}
                data-active={i === active}
              >
                <span className="deck-dot" />
                <span className="deck-dot-label">{chapter.nav}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="deck-counter" aria-hidden="true">
        <span>{String(active + 1).padStart(2, "0")}</span>
        <span className="deck-counter-rule" />
        <span className="deck-counter-total">{String(N).padStart(2, "0")}</span>
      </div>

      <div className="deck-progress" aria-hidden="true">
        <span ref={barRef} />
      </div>

      {active < N - 1 ? (
        <button type="button" className="deck-cue" onClick={() => go(1)}>
          <span className="rule-label">Scroll</span>
          <span className="deck-cue-line">
            <span className="cue-run" />
          </span>
        </button>
      ) : null}
    </div>
  );
}

/** What the page loads on: the wordmark alone, over Scene 1's first frame. */
function LogoCard({ chapter }) {
  return (
    <div className="slide-copy slide-copy--center">
      {/* No eyebrow: the wordmark already carries the company name. */}
      <Image
        src="/Logo.avif"
        alt="MILO INTERIEUR"
        width={832}
        height={188}
        priority
        className="intro-logo"
      />
      <p className="rule-label mt-10 text-bone/60">{chapter.meta}</p>
    </div>
  );
}

/** The line that opens the tour, held back until Scene 1 has played out. */
function StatementCopy({ chapter }) {
  return (
    <div className="slide-copy slide-copy--center">
      <p className="eyebrow">{chapter.eyebrow}</p>
      <h1 className="slide-head">{chapter.title}</h1>
      <p className="slide-lead mx-auto">{chapter.lead}</p>
    </div>
  );
}

function ServiceCopy({ chapter }) {
  return (
    <div className="slide-copy">
      <div className="service-copy">
        <p className="eyebrow">{chapter.eyebrow}</p>
        <h2 className="slide-head">{chapter.title}</h2>
        <p className="slide-lead">{chapter.lead}</p>
      </div>
    </div>
  );
}
