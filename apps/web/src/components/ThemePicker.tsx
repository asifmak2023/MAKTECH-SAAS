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
        className="theme-picker-trigger grid h-11 w-11 place-items-center border border-[#e5e5e5] text-[#262626] hover:border-black"
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
          className="theme-picker-menu absolute right-0 z-50 mt-2 w-[min(18.5rem,calc(100vw-1.5rem))] border border-[#e5e5e5] bg-white p-3 shadow-none"
        >
          <p className="mb-2 font-label text-[11px] font-semibold uppercase tracking-[0.14em] text-[#767676]">
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
                  className={`flex min-h-11 items-center gap-3 px-2 text-left normal-case tracking-normal ${
                    active ? "bg-[#f5f5f5] text-black" : "text-[#262626] hover:bg-[#fafafa]"
                  }`}
                  aria-pressed={active}
                >
                  <PaletteMark id={item.id} size={18} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-semibold uppercase tracking-[0.1em] font-label">
                      {item.label}
                    </span>
                    <span className="block text-[11px] font-normal normal-case tracking-normal text-[#767676]">
                      {item.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {canToggleMode && (
            <div className="mt-3 flex gap-2 border-t border-[#e5e5e5] pt-3">
              <button
                type="button"
                className={`min-h-11 flex-1 border px-3 text-[11px] font-semibold uppercase tracking-[0.12em] font-label ${
                  !dark ? "border-black bg-black text-white" : "border-[#e5e5e5] text-[#262626]"
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
                className={`min-h-11 flex-1 border px-3 text-[11px] font-semibold uppercase tracking-[0.12em] font-label ${
                  dark ? "border-black bg-black text-white" : "border-[#e5e5e5] text-[#262626]"
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
