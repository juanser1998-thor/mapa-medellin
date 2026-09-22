'use client';

import { useState } from 'react';
import {
  Bike,
  Building2,
  CableCar,
  CheckCircle2,
  Landmark as LandmarkIcon,
  Leaf,
  Palette,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Landmark, LandmarkIcon as LandmarkIconName } from './landmarks';

const icons: Record<LandmarkIconName, typeof Palette> = {
  art: Palette,
  heritage: LandmarkIcon,
  river: Bike,
  nature: Leaf,
  community: Building2,
  mobility: CableCar,
};

export function LandmarkChallenge({ landmark }: { landmark: Landmark }) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const correct = selected === landmark.challenge.answer;
  const Icon = icons[landmark.icon];

  return (
    <div className="grid min-h-0 overflow-y-auto lg:grid-cols-[0.86fr_1.14fr]">
      <section
        className="relative overflow-hidden p-6 text-white sm:p-8"
        style={{ background: `linear-gradient(145deg, ${landmark.color}, #153d37)` }}
      >
        <div className="absolute -right-16 -top-20 size-64 rounded-full border border-white/15 bg-white/10" />
        <div className="relative">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl border border-white/25 bg-white/15 shadow-lg backdrop-blur-sm">
            <Icon className="size-7" />
          </span>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            {landmark.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
            {landmark.name}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/85">
            {landmark.fact}
          </p>
          <div className="mt-7 rounded-2xl border border-white/20 bg-black/10 p-4 backdrop-blur-sm">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
              <Sparkles className="size-4" /> Mirada valuatoria
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/90">
              {landmark.valuationLens}
            </p>
          </div>
          <p className="mt-5 text-xs text-white/55">Fuente local: {landmark.source}</p>
        </div>
      </section>

      <section className="bg-white p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#168a77]">
          <span className="grid size-7 place-items-center rounded-full bg-[#dff5ef]">?</span>
          Desafío territorial
        </div>
        <h3 className="mt-5 text-2xl font-medium leading-tight tracking-[-0.035em] text-[#102723]">
          {landmark.challenge.prompt}
        </h3>
        <div className="mt-6 grid gap-3">
          {landmark.challenge.choices.map((choice, index) => {
            const isAnswer = index === landmark.challenge.answer;
            const isSelected = index === selected;
            const state = answered
              ? isAnswer
                ? 'border-[#24a87d] bg-[#e8f8f2] text-[#0d614c]'
                : isSelected
                  ? 'border-[#e97979] bg-[#fff0f0] text-[#8b3030]'
                  : 'border-[#dbe5e2] bg-[#f8faf9] text-[#70807c]'
              : 'border-[#dbe5e2] bg-white text-[#183c35] hover:border-[#24a87d] hover:bg-[#f0faf7]';
            return (
              <button
                key={choice}
                type="button"
                disabled={answered}
                onClick={() => setSelected(index)}
                className={`flex min-h-14 items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${state}`}
              >
                <span>{choice}</span>
                {answered && isAnswer && <CheckCircle2 className="size-5 shrink-0" />}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className={`mt-6 rounded-2xl p-5 ${correct ? 'bg-[#e8f8f2]' : 'bg-[#fff4e8]'}`}>
            <p className="font-semibold text-[#183c35]">
              {correct ? '¡Lectura territorial acertada!' : 'Buena pista para la próxima parada'}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#526762]">
              {landmark.challenge.explanation}
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-xl bg-white"
              onClick={() => setSelected(null)}
            >
              <RotateCcw className="size-4" /> Intentar de nuevo
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
