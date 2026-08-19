"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { site } from "@/lib/site";
import { chapters } from "@/lib/chapters";

/**
 * Fixed chrome over the deck. Navigation drives the deck directly rather than
 * scrolling, because the page has no scroll position to move to.
 */
export default function SiteHeader({ index, onNav }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const jump = (i) => {
    setOpen(false);
    onNav(i);
  };

  return (
    <>
      <header className="deck-header">
        <button type="button" onClick={() => jump(0)} className="text-left">
          {/* The drawn mark, where a mark belongs. Scene 1 carries it on the
              building itself, so the opening card does not repeat it. */}
          <Image
            src="/Logo.png"
            alt={site.name}
            width={2135}
            height={736}
            priority
            className="header-mark"
          />
          <span className="rule-label header-tagline block opacity-55">{site.tagline}</span>
        </button>

        <div className="flex items-center gap-6">
          <a
            href={`mailto:${site.email}`}
            className="rule-label hidden opacity-70 transition-opacity hover:opacity-100 md:block"
          >
            {site.email}
          </a>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rule-label flex items-center gap-2 border border-bone/30 px-4 py-2 transition-colors hover:border-bone"
            aria-expanded={open}
            aria-controls="deck-menu"
          >
            <Menu size={14} strokeWidth={1.5} aria-hidden="true" />
            Menu
          </button>
        </div>
      </header>

      <div
        id="deck-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        hidden={!open}
        className="fixed inset-0 z-60 bg-ink text-bone"
      >
        <div className="grain absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative flex h-full flex-col px-6 py-5 sm:px-10 lg:px-16">
          <div className="flex items-center justify-between">
            <span className="font-display text-sm tracking-[0.24em] uppercase">
              {site.name}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rule-label flex items-center gap-2 border border-bone/30 px-4 py-2 transition-colors hover:border-bone"
            >
              <X size={14} strokeWidth={1.5} aria-hidden="true" />
              Close
            </button>
          </div>

          <nav className="mt-12 flex-1 overflow-y-auto lg:mt-16">
            <ol className="max-w-4xl">
              {chapters.map((chapter, i) => (
                <li key={chapter.id} className="border-t border-bone/12">
                  <button
                    type="button"
                    onClick={() => jump(i)}
                    data-active={i === index}
                    className="group/item flex w-full items-baseline gap-5 py-3 text-left data-[active=true]:text-bone lg:py-4"
                  >
                    <span className="rule-label w-8 shrink-0 text-bone/55">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-[7vw] uppercase transition-transform duration-500 group-hover/item:translate-x-3 lg:text-[3.2vw]">
                      {chapter.nav}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="rule-label mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-bone/12 pt-6 opacity-70">
            <span>{site.offices[0].lines.join(", ")}</span>
            <span>{site.offices[1].lines.join(", ")}</span>
            <a href={`tel:${site.phoneHref}`} className="transition-opacity hover:opacity-100">
              {site.phone}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
