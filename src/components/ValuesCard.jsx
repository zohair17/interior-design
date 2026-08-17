"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { WALL, place } from "@/lib/film";

/**
 * Scene 10 ends on an empty portrait frame hanging on the wall, and the print
 * goes inside it — measured to the frame's own border. On a phone the camera
 * pulls back until the whole frame is in shot, which leaves the lower part of
 * the screen free for the words; on a wide screen they sit on the empty wall
 * to its left. Either way the print never leaves the frame.
 */
export default function ValuesCard({ chapter, show, box, narrow }) {
  return (
    <>
      {/* No slow reveal: the moment the shot settles on the frame the print is
          simply in it, and it is gone before the camera moves on. Anything
          longer reads as a picture being placed rather than one that hangs
          there — and the frame is still moving in shot until the last beat. */}
      <motion.div
        style={place(box, WALL.print)}
        className="wall-print"
        initial={{ opacity: 0 }}
        animate={{ opacity: show ? 1 : 0 }}
        transition={{ duration: show ? 0.22 : 0.12, ease: "linear" }}
      >
        <Image
          src="/asset/Milo.avif"
          alt={chapter.name}
          fill
          sizes="(max-width: 767px) 80vw, 30vw"
          // The photograph is landscape and the frame is portrait: crop to the
          // desk, not to the middle of the room.
          style={{ objectFit: "cover", objectPosition: "52% 32%" }}
        />
      </motion.div>

      <div className={`slide-copy values-copy${narrow ? " values-copy--below" : ""}`}>
        <p className="eyebrow">{chapter.eyebrow}</p>
        <h2 className="slide-head values-head">{chapter.title}</h2>
        <p className="values-name">{chapter.name}</p>
        <p className="values-role">{chapter.role}</p>
        <button
          type="button"
          className="ghost-button"
          // onClick={() => router.push("/about")}   // TODO: link to the about page
        >
          {chapter.cta}
        </button>
      </div>
    </>
  );
}
