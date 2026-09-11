"use client";

import { useEffect, useRef, useState } from "react";
import PaletteMark from "@/components/PaletteMark";
import {
  PALETTES,
  applyPalette,
  applyTheme,
  isDarkDocument,
  paletteMeta,
  readPalette,
  type PaletteId,
} from "@/lib/theme";

export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState<PaletteId>("fbr");
  const [dark, setDark] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPalette(readPalette());
    setDark(isDarkDocument());
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setPalette(readPalette());
      setDark(isDarkDocument());
    });
    observer.observe(el, { attributes: true, attributeFilter: ["class", "data-palette", "data-mode"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = paletteMeta(palette);
  const canToggleMode = current.modes.length > 1;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="theme-picker-trigger grid h-11 w-11 place-items-center text-[#262626] hover:bg-[#f3edf7]"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Appearance: ${current.label}`}
        title={`Appearance: ${current.label}`}
      >
        <span className="sr-only">Appearance</span>
        <PaletteMark id={palette} size={16} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Appearance"
          className="theme-picker-menu absolute right-0 z-50 mt-2 w-[min(18.5rem,calc(100vw-1.5rem))] p-3"
        >
          <p className="mb-2 font-label text-[12px] font-medium tracking-[0.4px] text-[#767676]">
            Appearance
          </p>
          <div className="flex flex-col gap-1">
            {PALETTES.map((item) => {
              const active = item.id === palette;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    applyPalette(item.id);
                    setPalette(item.id);
                    setDark(isDarkDocument());
                  }}
                  className={`flex min-h-12 items-center gap-3 rounded-full px-3 text-left normal-case tracking-normal ${
                    active ? "bg-[#e6e1e5] text-black" : "text-[#262626] hover:bg-[#f3edf7]"
                  }`}
                  aria-pressed={active}
                >
                  <PaletteMark id={item.id} size={18} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium font-label">
                      {item.label}
                    </span>
                    <span className="block text-[12px] font-normal normal-case tracking-normal text-[#767676]">
                      {item.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {canToggleMode && (
            <div className="mt-3 flex gap-2 pt-3">
              <button
                type="button"
                className={`min-h-11 flex-1 rounded-full px-3 text-[12px] font-medium tracking-[0.4px] font-label ${
                  !dark ? "bg-black text-white" : "bg-[#f3edf7] text-[#262626]"
                }`}
                onClick={() => {
                  applyTheme(false);
                  setDark(false);
                }}
                aria-pressed={!dark}
              >
                Light
              </button>
              <button
                type="button"
                className={`min-h-11 flex-1 rounded-full px-3 text-[12px] font-medium tracking-[0.4px] font-label ${
                  dark ? "bg-black text-white" : "bg-[#f3edf7] text-[#262626]"
                }`}
                onClick={() => {
                  applyTheme(true);
                  setDark(true);
                }}
                aria-pressed={dark}
              >
                Dark
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
