'use client';

import { ArrowRight, Compass, MapPin } from 'lucide-react';
import type { Landmark } from './landmarks';

export function LandmarkDirectory({
  landmarks,
  onSelect,
}: {
  landmarks: Landmark[];
  onSelect: (landmark: Landmark) => void;
}) {
  return (
    <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col bg-[#f4f8f7] sm:max-h-[92dvh]">
      <header className="shrink-0 border-b border-[#dce9e5] bg-white px-6 py-6 sm:px-8">
        <div className="flex items-start gap-4 pr-10">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#dff5ef] text-[#147c69]">
            <Compass className="size-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#168a77]">
              Medellín para explorar
            </p>
            <h2 className="mt-1 text-3xl font-medium tracking-[-0.045em] text-[#102723]">
              Hitos y puntos de interés
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#526762]">
              Elige un lugar para ubicarlo en el mapa, descubrir su relación con el territorio y resolver un mini reto.
            </p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3 px-1 text-sm text-[#526762]">
          <span>{landmarks.length} lugares disponibles</span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4 text-[#168a77]" /> Selecciona una tarjeta
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {landmarks.map((landmark, index) => (
            <button
              key={landmark.id}
              type="button"
              onClick={() => onSelect(landmark)}
              className="group flex min-h-48 flex-col rounded-2xl border border-[#d5e3df] bg-white p-4 text-left shadow-[0_10px_28px_rgba(24,52,47,.07)] transition hover:-translate-y-0.5 hover:border-[#72bdaa] hover:shadow-[0_16px_34px_rgba(24,92,77,.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#168a77]"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-xl text-xl font-semibold text-white shadow-md"
                  style={{ background: landmark.color }}
                >
                  {landmark.glyph}
                </span>
                <span className="rounded-full bg-[#edf7f4] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#147c69]">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <p className="mt-4 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#168a77]">
                {landmark.eyebrow}
              </p>
              <h3 className="mt-1 text-xl font-medium leading-tight tracking-[-0.03em] text-[#153b34]">
                {landmark.name}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#61736f]">
                {landmark.fact}
              </p>
              <span className="mt-auto flex items-center gap-2 pt-4 text-sm font-semibold text-[#147c69]">
                Ubicar y explorar
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
