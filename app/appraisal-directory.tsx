'use client';

import { ArrowRight, Building2, MapPin } from 'lucide-react';
import type { Appraisal } from './data';

/* oxlint-disable next/no-img-element -- miniaturas locales del directorio de avalúos */

function titleCase(value: string) {
  return value
    .toLocaleLowerCase('es-CO')
    .replace(/(^|[\s/])\p{L}/gu, (letter) => letter.toLocaleUpperCase('es-CO'));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function AppraisalDirectory({
  appraisals,
  onSelect,
}: {
  appraisals: Appraisal[];
  onSelect: (appraisal: Appraisal) => void;
}) {
  return (
    <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col bg-[#f4f8f7] sm:max-h-[92dvh]">
      <header className="shrink-0 border-b border-[#dce9e5] bg-white px-6 py-6 sm:px-8">
        <div className="flex items-start gap-4 pr-10">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#dff5ef] text-[#147c69]">
            <Building2 className="size-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#168a77]">
              Portafolio disponible
            </p>
            <h2 className="mt-1 text-3xl font-medium tracking-[-0.045em] text-[#102723]">
              Directorio de avalúos
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#526762]">
              Revisa todos los inmuebles, ubícalos en el mapa y abre su experiencia interactiva.
            </p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3 px-1 text-sm text-[#526762]">
          <span>{appraisals.length} avalúos disponibles</span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4 text-[#168a77]" /> Selecciona una tarjeta
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {appraisals.map((appraisal, index) => (
            <button
              key={appraisal.id}
              type="button"
              onClick={() => onSelect(appraisal)}
              className="group overflow-hidden rounded-2xl border border-[#d5e3df] bg-white text-left shadow-[0_10px_28px_rgba(24,52,47,.07)] transition hover:-translate-y-0.5 hover:border-[#72bdaa] hover:shadow-[0_16px_34px_rgba(24,92,77,.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#168a77]"
            >
              <div className="relative h-36 overflow-hidden bg-[#dce8e4]">
                <img
                  src={appraisal.foto}
                  alt={`Fachada del avalúo en ${appraisal.barrio}`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
                />
                <span className="absolute left-3 top-3 rounded-full border border-white/60 bg-[#102723]/78 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <div className="flex min-h-52 flex-col p-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#168a77]">
                  {appraisal.municipio || 'Medellín'} · {appraisal.barrio}
                </p>
                <h3 className="mt-1 text-lg font-medium leading-tight tracking-[-0.03em] text-[#153b34]">
                  {titleCase(appraisal.tipo)}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#61736f]">
                  {appraisal.descripcion || appraisal.direccion || 'Ficha técnica disponible'}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#e3ece9] pt-3 text-sm">
                  <span className="font-semibold text-[#183c35]">{formatMoney(appraisal.valor)}</span>
                  <span className="flex items-center gap-1.5 font-semibold text-[#147c69]">
                    Ubicar
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
