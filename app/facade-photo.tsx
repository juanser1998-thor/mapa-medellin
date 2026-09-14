'use client';

import { useState } from 'react';
import { Building2, Expand } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function FacadePhoto({ src, barrio }: { src?: string; barrio: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-dashed border-[#72a39a]/35 bg-[#0d202b] p-4 text-[#a6bdb9]">
        <Building2 className="size-6 shrink-0" aria-hidden="true" />
        <p className="text-sm">{failed ? 'La foto de fachada no está disponible.' : 'Foto de fachada pendiente.'}</p>
      </div>
    );
  }
  return (
    <Dialog>
      <DialogTrigger className="group relative mb-6 block w-full overflow-hidden rounded-2xl bg-[#e8efed] text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#168a77]" aria-label={`Ampliar fachada de un inmueble en ${barrio}`}>
        <img src={src} alt={`Fachada de un inmueble en ${barrio}`} className="aspect-[4/3] w-full object-cover" loading="lazy" decoding="async" onError={() => setFailed(true)} />
        <span className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg bg-[#102723]/85 px-3 py-2 text-sm text-white"><Expand className="size-4" /> Ampliar fachada</span>
      </DialogTrigger>
      <DialogContent className="w-[92vw] border-[#73ffe1]/20 bg-[#081722] text-[#edf8f6] sm:max-w-5xl">
        <DialogTitle>Fachada · {barrio}</DialogTitle>
        <img src={src} alt={`Fachada de un inmueble en ${barrio}`} className="max-h-[78dvh] w-full object-contain" />
      </DialogContent>
    </Dialog>
  );
}
