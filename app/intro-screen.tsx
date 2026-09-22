'use client';

import {
  ArrowRight,
  Building2,
  Gamepad2,
  MapPin,
  MapPinned,
  MousePointer2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function IntroScreen({
  ready,
  appraisalCount,
  locationCount,
  onEnter,
}: {
  ready: boolean;
  appraisalCount: number;
  locationCount: number;
  onEnter: () => void;
}) {
  return (
    <section
      className="absolute inset-0 z-[60] overflow-y-auto bg-[linear-gradient(135deg,#f7fbfa_0%,#e4f4ef_48%,#d8eee8_100%)] text-[#102723]"
      aria-label="Introducción al mapa interactivo de avalúos"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-20 -top-28 size-[26rem] rounded-full border border-[#16947d]/15 bg-[#75d9c3]/20 blur-2xl" />
        <div className="absolute -bottom-40 right-[-5rem] size-[34rem] rounded-full border border-[#168a77]/15 bg-[#b6e6da]/45 blur-3xl" />
        <MapPin className="absolute right-[8%] top-[12%] size-20 fill-[#16bcff] text-white opacity-70 drop-shadow-[0_16px_18px_rgba(22,188,255,.35)]" />
        <MapPin className="absolute bottom-[14%] left-[7%] size-14 fill-[#ff398b] text-white opacity-60 drop-shadow-[0_14px_16px_rgba(255,57,139,.3)]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(22,138,119,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(22,138,119,.18)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <div className="relative mx-auto flex min-h-full w-full max-w-[1240px] items-center px-5 py-8 sm:px-8 lg:px-12">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/80 bg-white/84 shadow-[0_30px_90px_rgba(28,77,67,.2)] backdrop-blur-xl lg:grid-cols-[1.1fr_.9fr]">
          <div className="flex flex-col justify-between p-6 sm:p-9 lg:p-12">
            <div>
              {/* oxlint-disable-next-line next/no-img-element -- local transparent brand asset */}
              <img
                src="/appraiser-logo.png"
                alt="Appraiser"
                className="h-auto w-[min(72vw,270px)] object-contain object-left"
              />
              <div className="mt-9 inline-flex items-center gap-2 rounded-full border border-[#abd8ce] bg-[#eaf8f4] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#137f6d]">
                <Sparkles className="size-4" /> Experiencia interactiva · Medellín
              </div>
              <h1 className="mt-5 max-w-2xl text-4xl font-medium leading-[.98] tracking-[-0.055em] text-[#102723] sm:text-5xl lg:text-6xl">
                Descubre la ciudad con ojo de avaluador
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#506d66] sm:text-lg">
                Recorre Medellín en 3D, explora avalúos reales y pon a prueba tu criterio con preguntas breves antes de revelar cada ficha.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button
                size="lg"
                disabled={!ready}
                onClick={onEnter}
                className="h-14 rounded-xl bg-[#137f6d] px-6 text-base font-semibold text-white shadow-[0_14px_34px_rgba(19,127,109,.26)] hover:bg-[#0d695a] disabled:bg-[#9bbab3]"
              >
                {ready ? (
                  <>
                    Entrar al mapa <ArrowRight className="size-5" />
                  </>
                ) : (
                  <>
                    <span className="size-2.5 animate-pulse rounded-full bg-white" />
                    Preparando Medellín en 3D…
                  </>
                )}
              </Button>
              <p className="flex items-center gap-2 text-sm text-[#607a74]">
                <MousePointer2 className="size-4 text-[#168a77]" /> Diseñado para explorar con mouse o pantalla táctil
              </p>
            </div>
          </div>

          <aside className="relative overflow-hidden bg-[#123e36] p-6 text-white sm:p-9 lg:p-12">
            <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border border-white/10 bg-[#1da78e]/25 blur-2xl" aria-hidden="true" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8ce6d3]">Cómo funciona</p>
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-white/12 bg-white/[.07] p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1b8f7b]"><MapPinned className="size-5" /></span>
                    <div>
                      <h2 className="font-semibold">Explora el mapa 3D</h2>
                      <p className="mt-1 text-sm leading-relaxed text-[#c5ddd8]">Muévete entre edificios y encuentra los pines de colores y los hitos territoriales.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/[.07] p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#187da0]"><Building2 className="size-5" /></span>
                    <div>
                      <h2 className="font-semibold">Descubre cada inmueble</h2>
                      <p className="mt-1 text-sm leading-relaxed text-[#c5ddd8]">Cada pin representa un avalúo con fotografía de fachada y datos no identificadores.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/[.07] p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#bb3b75]"><Gamepad2 className="size-5" /></span>
                    <div>
                      <h2 className="font-semibold">Acepta el reto</h2>
                      <p className="mt-1 text-sm leading-relaxed text-[#c5ddd8]">Responde cuatro preguntas, aprende con cada resultado y revela la ficha al final.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-[#75d9c3]/25 bg-[#0d312b] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#75d9c3]">Nuestro propósito</p>
                <p className="mt-2 text-sm leading-relaxed text-[#d6e9e5]">
                  Acercar la actividad valuatoria de forma visual, entretenida y educativa, mostrando que un avalúo combina datos, mercado y criterio profesional.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-5 text-sm text-[#c5ddd8]">
                <span><strong className="block text-xl font-medium text-white">{appraisalCount.toLocaleString('es-CO')}</strong> avalúos</span>
                <span><strong className="block text-xl font-medium text-white">{locationCount.toLocaleString('es-CO')}</strong> ubicaciones</span>
                <span><strong className="block text-xl font-medium text-white">4</strong> preguntas por reto</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
