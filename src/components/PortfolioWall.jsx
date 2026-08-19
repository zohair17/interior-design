"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { WALL, place } from "@/lib/film";

/**
 * Nine works, hung on the wall Scene 9 ends on. Each frame is a real target —
 * the destination is the one thing still missing, so the anchor is a button
 * until the project pages exist.
 */
const works = Array.from({ length: 9 }, (_, i) => ({
  id: `P${i + 1}`,
  src: `/asset/Portfolio/P${i + 1}.jpg`,
  label: `Project ${String(i + 1).padStart(2, "0")}`,
  // href: `/portfolio/project-${i + 1}`,   // TODO: link each frame to its project page
}));

const wall = {
  out: {},
  in: { transition: { staggerChildren: 0.055, delayChildren: 0.12 } },
};

/**
 * Opacity only. These hang on a wall in the footage, so they must not slide or
 * scale into place — that would read as an overlay drifting over the film.
 */
const frame = {
  out: { opacity: 0, transition: { duration: 0.12 } },
  in: { opacity: 1, transition: { duration: 0.45, ease: "linear" } },
};

export default function PortfolioWall({ chapter, show, box, narrow }) {
  // Three across on a wide screen, two down the middle on a phone — both hang
  // inside the same wall, measured in the film's own pixels.
  const grid = narrow ? WALL.gridMobile : WALL.grid;
  const label = narrow ? WALL.labelMobile : WALL.label;

  return (
    <>
      <div style={place(box, label)} className="wall-label">
        <span className="eyebrow">{chapter.eyebrow}</span>
        <span className="wall-rule" />
        <span className="rule-label">{chapter.meta}</span>
      </div>

      <motion.ul
        style={{
          ...place(box, grid),
          gridTemplateColumns: `repeat(${narrow ? 2 : 3}, 1fr)`,
          gridTemplateRows: `repeat(${narrow ? 5 : 3}, 1fr)`,
          columnGap: grid.gapX * box.scale,
          rowGap: grid.gapY * box.scale,
        }}
        className="wall-grid"
        variants={wall}
        initial="out"
        animate={show ? "in" : "out"}
      >
        {works.map((work) => (
          <motion.li key={work.id} variants={frame}>
            <motion.button
              type="button"
              className="wall-frame"
              aria-label={work.label}
              whileHover={{ scale: 1.035 }}
              whileTap={{ scale: 0.995 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              // onClick={() => router.push(work.href)}
            >
              {/* The moulding is the button itself; the mount is the window
                  cut in it, and the photograph sits inside that — the way a
                  framed piece hangs, rather than a picture stuck to a wall. */}
              <span className="wall-mount">
                <Image
                  src={work.src}
                  alt={work.label}
                  fill
                  sizes="(max-width: 767px) 45vw, 22vw"
                  className="wall-shot"
                />
                <span className="wall-caption">{work.label}</span>
              </span>
            </motion.button>
          </motion.li>
        ))}
      </motion.ul>
    </>
  );
}
