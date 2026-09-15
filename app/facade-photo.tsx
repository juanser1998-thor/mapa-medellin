'use client';

import { useState } from 'react';
import { Building2, Expand } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function FacadePhoto({
  src,
  barrio,
  label,
  className = 'mb-6',
  eager = false,
}: {
  src?: string;
  barrio: string;
  label?: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className} flex min-h-40 items-center justify-center gap-3 rounded-xl border border-dashed border-[#72a39a]/35 bg-[#0d202b] p-4 text-[#a6bdb9]`}>
        <Building2 className="size-6 shrink-0" aria-hidden="true" />
        <p className="text-sm">{failed ? 'La foto de fachada no está disponible.' : 'Foto de fachada pendiente.'}</p>
      </div>
    );
  }
  return (
    <Dialog>
      <DialogTrigger className={`group relative block w-full overflow-hidden rounded-2xl border border-[#76ffe2]/20 bg-[#e8efed] text-left shadow-[0_16px_44px_rgba(0,0,0,.22)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#58ead6] ${className}`} aria-label={`Ampliar fachada de un inmueble en ${barrio}`}>
        <img src={src} alt={`Fachada de un inmueble en ${barrio}`} className="aspect-[5/4] w-full object-cover transition duration-500 group-hover:scale-[1.025]" loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />
        {label && <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-[#07151e]/88 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md">{label}</span>}
        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-[#06131d] via-[#06131d]/72 to-transparent px-4 pb-4 pt-14 text-white">
          <span className="min-w-0 truncate text-sm font-medium">{barrio}</span>
          <span className="flex shrink-0 items-center gap-2 rounded-lg border border-white/15 bg-[#102723]/90 px-3 py-2 text-sm font-semibold"><Expand className="size-4" /> Ampliar</span>
        </span>
      </DialogTrigger>
      <DialogContent className="w-[96vw] border-[#73ffe1]/20 bg-[#081722] p-4 text-[#edf8f6] sm:max-w-6xl sm:p-6">
        <DialogTitle className="pr-10">Fachada · {barrio}</DialogTitle>
        <img src={src} alt={`Fachada ampliada de un inmueble en ${barrio}`} className="max-h-[82dvh] w-full rounded-xl bg-black/20 object-contain" />
      </DialogContent>
    </Dialog>
  );
}
