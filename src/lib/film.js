"use client";

import { useEffect, useState } from "react";

/**
 * The composited walkthrough's own pixel grid. Everything that has to sit ON
 * something in the footage — the portfolio frames on the wall, the print inside
 * the picture frame — is measured in these coordinates, then mapped to the
 * screen at runtime. Measured values come from frames pulled out of the built
 * file, not from the source clips, because the build crops and rescales them.
 */
export const FILM = { w: 1600, h: 900 };

export const WALL = {
  /**
   * Scene 9 ends on an empty lit wall, usable between x 180-1380 and y 30-735
   * (the credenza top). Its three spotlights fall at x 480, 840 and 1200, so the
   * desktop grid's three columns are centred on them.
   */
  grid: { x: 335, y: 140, w: 1010, h: 557, gapX: 70, gapY: 34 },
  label: { x: 335, y: 74, w: 1010, h: 46 },
  /**
   * A portrait viewport only ever sees a narrow slice of the film — about 416
   * film pixels wide on a 390pt phone — so the same nine frames hang in two
   * columns down the middle of that same wall, still inside its bounds.
   */
  gridMobile: { x: 620, y: 130, w: 360, h: 541, gapX: 14, gapY: 14 },
  labelMobile: { x: 620, y: 78, w: 360, h: 34 },
  /**
   * Scene 10 ends on a single empty portrait frame. Its dark border runs
   * x 887-1391 and y 106-804 in the built film, so the print fills just inside.
   */
  print: { x: 895, y: 114, w: 486, h: 676 },
};

/**
 * Below this width the film is cropped hard enough by a full-bleed fit that
 * framing becomes a per-beat decision rather than one global crop.
 */
const NARROW = "(max-width: 767px)";

export function useIsNarrow() {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return narrow;
}

/**
 * Where the film sits on screen, in one place for both the video and anything
 * pinned to it.
 *
 * With no camera the film simply covers the viewport, which is what every
 * caption beat wants. A camera instead fits one rect of the film — the picture
 * frame, say — inside a box given as fractions of the screen, and lets the film
 * fall short of the edges if it must: on a portrait phone a 504px-wide frame
 * cannot both fill the width and stay whole, and staying whole is the point.
 */
export function useFilmBox(camera) {
  const [box, setBox] = useState(() => ({ scale: 1, x: 0, y: 0 }));

  useEffect(() => {
    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (!camera) {
        const scale = Math.max(vw / FILM.w, vh / FILM.h);
        setBox({ scale, x: (vw - FILM.w * scale) / 2, y: (vh - FILM.h * scale) / 2 });
        return;
      }

      const { rect, box: frame } = camera;
      const bw = frame.w * vw;
      const bh = frame.h * vh;
      const scale = Math.min(bw / rect.w, bh / rect.h);
      setBox({
        scale,
        x: frame.x * vw + bw / 2 - (rect.x + rect.w / 2) * scale,
        y: frame.y * vh + bh / 2 - (rect.y + rect.h / 2) * scale,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [camera]);

  return box;
}

/** Turns a rect in film pixels into an absolutely positioned style. */
export function place(box, rect) {
  return {
    position: "absolute",
    left: box.x + rect.x * box.scale,
    top: box.y + rect.y * box.scale,
    width: rect.w * box.scale,
    height: rect.h * box.scale,
  };
}
