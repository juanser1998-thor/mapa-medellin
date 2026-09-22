'use client';

import { useState } from 'react';
import { Building2, Expand, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

/* oxlint-disable next/no-img-element -- imágenes locales anonimizadas y selector de galería */

export function FacadePhoto({
  src,
  images,
  barrio,
  label,
  className = 'mb-6',
  eager = false,
}: {
  src?: string;
  images?: string[];
  barrio: string;
  label?: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const gallery = [...new Set((images?.length ? images : src ? [src] : []).filter(Boolean))];
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSrc = gallery[activeIndex] ?? src;
  if (!activeSrc || failed) {
    return (
      <div className={`${className} flex min-h-40 items-center justify-center gap-3 rounded-xl border border-dashed border-[#c6d9d3] bg-[#f5f9f8] p-4 text-[#61736f]`}>
        <Building2 className="size-6 shrink-0" aria-hidden="true" />
        <p className="text-sm">{failed ? 'La foto de fachada no está disponible.' : 'Foto de fachada pendiente.'}</p>
      </div>
    );
  }
  return (
    <div className={className}>
      <Dialog>
        <DialogTrigger className="group relative block w-full overflow-hidden rounded-2xl border border-white/90 bg-[#e8efed] text-left shadow-[0_16px_44px_rgba(24,52,47,.18)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#168a77]" aria-label={`Ampliar imagen de un inmueble en ${barrio}`}>
          <img src={activeSrc} alt={`Imagen ${activeIndex + 1} de un inmueble en ${barrio}`} className="aspect-[5/4] w-full object-cover transition duration-500 group-hover:scale-[1.025]" loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />
          {label && <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-[#07151e]/88 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md">{label}</span>}
          {gallery.length > 1 && <span className="absolute right-3 top-3 rounded-full border border-white/20 bg-[#07151e]/88 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">{activeIndex + 1}/{gallery.length}</span>}
          <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-[#06131d] via-[#06131d]/72 to-transparent px-4 pb-4 pt-14 text-white">
            <span className="min-w-0 truncate text-sm font-medium">{barrio}</span>
            <span className="flex shrink-0 items-center gap-2 rounded-lg border border-white/15 bg-[#102723]/90 px-3 py-2 text-sm font-semibold"><Expand className="size-4" /> Ampliar</span>
          </span>
        </DialogTrigger>
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain border-white/80 bg-white p-3 text-[#102723] sm:max-h-[calc(100dvh-2rem)] sm:max-w-6xl sm:p-5"
        >
          <div className="sticky top-0 z-20 -mx-1 -mt-1 flex items-center gap-3 rounded-xl bg-white/95 px-1 py-1 backdrop-blur-md">
            <DialogTitle className="min-w-0 flex-1 truncate">Galería del inmueble · {barrio}</DialogTitle>
            <DialogClose
              className="grid size-10 shrink-0 place-items-center rounded-full border border-[#c9d9d5] bg-white text-[#183c35] shadow-[0_5px_18px_rgba(24,52,47,.18)] transition hover:bg-[#edf7f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168a77]"
              aria-label="Cerrar galería"
            >
              <X className="size-5" />
            </DialogClose>
          </div>
          <img
            src={activeSrc}
            alt={`Imagen ampliada ${activeIndex + 1} de un inmueble en ${barrio}`}
            className={`${gallery.length > 1 ? 'max-h-[calc(100dvh-13rem)]' : 'max-h-[calc(100dvh-6rem)]'} min-h-0 w-full rounded-xl bg-black/20 object-contain`}
          />
          {gallery.length > 1 && (
            <div className="grid grid-cols-3 gap-2">
              {gallery.map((image, index) => (
                <button key={image} type="button" onClick={() => setActiveIndex(index)} className={`overflow-hidden rounded-lg border-2 transition ${activeIndex === index ? 'border-[#168a77] ring-2 ring-[#168a77]/20' : 'border-transparent opacity-75 hover:opacity-100'}`} aria-label={`Ver imagen ${index + 1}`}>
                  <img src={image} alt="" className="max-h-24 w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {gallery.length > 1 && (
        <div className="mt-2 grid grid-cols-3 gap-2" aria-label="Selector de imágenes del inmueble">
          {gallery.map((image, index) => (
            <button key={image} type="button" onClick={() => setActiveIndex(index)} className={`overflow-hidden rounded-lg border-2 transition ${activeIndex === index ? 'border-[#168a77] ring-2 ring-[#168a77]/20' : 'border-white opacity-75 hover:opacity-100'}`} aria-label={`Mostrar imagen ${index + 1}`}>
              <img src={image} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
