'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  Scale,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appraisals, type Appraisal } from './data';
import { FacadePhoto } from './facade-photo';

type Metric = 'squareMeter' | 'value';

type Choice = {
  id: string;
  label: string;
  numericValue?: number;
  correct: boolean;
};

type TriviaQuestion = {
  eyebrow: string;
  prompt: string;
  choices: Choice[];
  fact: string;
  lesson: string;
  source?: string;
  visual?: 'property' | 'comparison' | 'norm';
  comparison?: Appraisal;
};

type NormQuestion = {
  prompt: string;
  choices: Choice[];
  fact: string;
  lesson: string;
  source: string;
};

function titleCase(value: string) {
  return value
    .toLocaleLowerCase('es-CO')
    .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase('es-CO'));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSquareMeter(value: number) {
  return `${formatMoney(Math.round(value))}/m²`;
}

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicShuffle<T>(values: T[], key: string) {
  const result = [...values];
  let seed = hashText(key) || 1;
  for (let index = result.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const target = seed % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function primaryArea(record: Appraisal) {
  const privateArea = record.areaPrivada ?? 0;
  const builtArea = record.areaConstruida ?? 0;
  const landArea = record.areaTerreno ?? 0;

  if (record.tipo === 'APARTAMENTO' && privateArea > 0) {
    return privateArea;
  }
  if (record.tipo === 'CASA' && builtArea > 0) {
    return builtArea;
  }
  if (privateArea > 0) return privateArea;
  if (builtArea > 0) return builtArea;
  return landArea;
}

function metricValue(record: Appraisal, metric: Metric) {
  if (metric === 'value') return record.valor;
  const area = primaryArea(record);
  return area > 0 ? record.valor / area : 0;
}

function metricLabel(metric: Metric, value: number) {
  if (metric === 'value') return formatMoney(value);
  return formatSquareMeter(value);
}

function regimeChoices(record: Appraisal) {
  return deterministicShuffle<Choice>(
    [
      {
        id: 'regime-ph',
        label: 'Propiedad horizontal (PH)',
        correct: record.regimen === 'PH',
      },
      {
        id: 'regime-nph',
        label: 'No propiedad horizontal (NPH)',
        correct: record.regimen === 'NPH',
      },
    ],
    `${record.id}:regime`,
  );
}

function rangeStep(metric: Metric, value: number) {
  if (metric === 'squareMeter') {
    if (value < 2_000_000) return 250_000;
    if (value < 5_000_000) return 500_000;
    if (value < 10_000_000) return 1_000_000;
    return 2_000_000;
  }
  if (value < 200_000_000) return 25_000_000;
  if (value < 500_000_000) return 50_000_000;
  if (value < 1_000_000_000) return 100_000_000;
  if (value < 2_000_000_000) return 200_000_000;
  return 500_000_000;
}

function metricRangeChoices(record: Appraisal, metric: Metric) {
  const value = metricValue(record, metric);
  const step = rangeStep(metric, value);
  const actualStart = Math.floor(value / step) * step;
  const rangesBelow = Math.min(2, Math.floor(actualStart / step));
  const firstStart = actualStart - rangesBelow * step;
  const choices = Array.from({ length: 4 }, (_, index) => {
    const start = firstStart + index * step;
    const end = start + step;
    return {
      id: `range-${metric}-${index}`,
      label: `De ${metricLabel(metric, start)} a menos de ${metricLabel(metric, end)}`,
      numericValue: start + step / 2,
      correct: value >= start && value < end,
    };
  });
  return deterministicShuffle(choices, `${record.id}:${metric}-range`);
}

const normQuestions: NormQuestion[] = [
  {
    prompt: '¿Qué describe mejor el valor comercial de un inmueble?',
    choices: [
      { id: 'commercial-market', label: 'El precio más favorable en un mercado libre e informado', correct: true },
      { id: 'commercial-owner', label: 'El precio que decide únicamente el propietario', correct: false },
      { id: 'commercial-tax', label: 'El valor usado automáticamente para impuestos', correct: false },
      { id: 'commercial-insurance', label: 'El costo de asegurarlo contra daños', correct: false },
    ],
    fact: 'Es el precio más favorable cuando las partes actúan libremente y conocen las condiciones del bien.',
    lesson: 'El valor comercial no es simplemente el precio publicado por el vendedor.',
    source: 'Decreto 1420 de 1998, artículo 2.',
  },
  {
    prompt: '¿Dónde debe acreditarse la inscripción de un avaluador?',
    choices: [
      { id: 'registry-raa', label: 'En el Registro Abierto de Avaluadores (RAA)', correct: true },
      { id: 'registry-commerce', label: 'Solo en la Cámara de Comercio', correct: false },
      { id: 'registry-cadastre', label: 'En el registro catastral municipal', correct: false },
      { id: 'registry-property', label: 'En la Oficina de Registro de Instrumentos Públicos', correct: false },
    ],
    fact: 'La Ley 1673 creó el Registro Abierto de Avaluadores y regula la inscripción.',
    lesson: 'La inscripción en el RAA acredita el ejercicio formal de la actividad valuatoria.',
    source: 'Ley 1673 de 2013, artículos 5 y 6.',
  },
  {
    prompt: '¿Cuál de estos sí es un método valuatorio reconocido?',
    choices: [
      { id: 'method-market', label: 'Comparación o método de mercado', correct: true },
      { id: 'method-average', label: 'Promedio simple de anuncios sin depuración', correct: false },
      { id: 'method-owner', label: 'Valor elegido por el propietario', correct: false },
      { id: 'method-neighbor', label: 'Precio de un único vecino', correct: false },
    ],
    fact: 'La comparación de mercado analiza ofertas o transacciones comparables.',
    lesson: 'Un buen comparable debe analizarse; no basta con copiar un anuncio.',
    source: 'Resolución IGAC 620 de 2008.',
  },
  {
    prompt: '¿Qué debe indicar un informe de avalúo además del valor final?',
    choices: [
      { id: 'report-method', label: 'El método y las consideraciones de la estimación', correct: true },
      { id: 'report-photo', label: 'Únicamente una fotografía de fachada', correct: false },
      { id: 'report-stratum', label: 'Solamente el estrato del sector', correct: false },
      { id: 'report-owner', label: 'La expectativa económica del propietario', correct: false },
    ],
    fact: 'El informe debe especificar el método utilizado y las consideraciones de la estimación.',
    lesson: 'Un avalúo es una conclusión sustentada, no una cifra aislada.',
    source: 'Decreto 1420 de 1998, artículo 20.',
  },
];

function normQuestionFor(record: Appraisal) {
  const selected = normQuestions[hashText(record.id) % normQuestions.length];
  return {
    ...selected,
    choices: deterministicShuffle(selected.choices, `${record.id}:norm`),
  };
}

function stratumChoices(record: Appraisal) {
  const stratum = Number(record.estrato);
  const selected = Number.isFinite(stratum)
    ? stratum <= 2
      ? 'stratum-12'
      : stratum <= 4
        ? 'stratum-34'
        : 'stratum-56'
    : 'stratum-na';
  return deterministicShuffle<Choice>(
    [
      { id: 'stratum-12', label: 'Estratos 1–2', correct: selected === 'stratum-12' },
      { id: 'stratum-34', label: 'Estratos 3–4', correct: selected === 'stratum-34' },
      { id: 'stratum-56', label: 'Estratos 5–6', correct: selected === 'stratum-56' },
      { id: 'stratum-na', label: 'No aplica', correct: selected === 'stratum-na' },
    ],
    `${record.id}:stratum`,
  );
}

function useChoices(record: Appraisal) {
  const catalog = [
    'RESIDENCIAL',
    'COMERCIO Y SERVICIOS',
    'MIXTO',
    'INDUSTRIAL',
    'HOTEL',
    'SIN INFORMACION',
    'NO APLICA',
  ];
  const alternatives = deterministicShuffle(
    catalog.filter((value) => value !== record.uso),
    `${record.id}:use-options`,
  ).slice(0, 3);
  return deterministicShuffle<Choice>(
    [record.uso, ...alternatives].map((value) => ({
      id: `use-${value}`,
      label: titleCase(value === 'SIN INFORMACION' ? 'Sin información' : value),
      correct: value === record.uso,
    })),
    `${record.id}:use`,
  );
}

function typeChoices(record: Appraisal) {
  const catalog = [
    'APARTAMENTO',
    'CASA',
    'OFICINA',
    'LOCAL',
    'APARTA SUITE',
    'CONSULTORIO',
    'EDIFICIO',
    'LOTE',
  ];
  const alternatives = deterministicShuffle(
    catalog.filter((value) => value !== record.tipo),
    `${record.id}:type-options`,
  ).slice(0, 3);
  return deterministicShuffle<Choice>(
    [record.tipo, ...alternatives].map((value) => ({
      id: `type-${value}`,
      label: titleCase(value),
      correct: value === record.tipo,
    })),
    `${record.id}:type`,
  );
}

function attributeQuestionFor(record: Appraisal): TriviaQuestion {
  const variant = hashText(`${record.id}:attribute`) % 4;
  if (variant === 0) {
    return {
      eyebrow: 'Régimen del inmueble',
      prompt: '¿Propiedad horizontal o no propiedad horizontal?',
      choices: regimeChoices(record),
      fact: `Régimen registrado: ${record.regimen === 'PH' ? 'Propiedad horizontal (PH)' : 'No propiedad horizontal (NPH)'}.`,
      lesson: 'En propiedad horizontal conviven bienes privados y bienes comunes.',
      source: 'Ley 675 de 2001, artículos 1 y 3.',
    };
  }
  if (variant === 1) {
    return {
      eyebrow: 'Lee el contexto',
      prompt: '¿En qué rango de estrato está registrado este inmueble?',
      choices: stratumChoices(record),
      fact: `Estrato registrado: ${record.estrato}.`,
      lesson: 'El estrato aporta contexto, pero no determina por sí solo el valor comercial.',
    };
  }
  if (variant === 2) {
    return {
      eyebrow: 'Uso registrado',
      prompt: '¿Cuál es el uso principal registrado para este inmueble?',
      choices: useChoices(record),
      fact: `Uso registrado: ${titleCase(record.uso)}.`,
      lesson: 'El uso permitido y efectivo influye en los comparables adecuados.',
    };
  }
  return {
    eyebrow: 'Reconoce el inmueble',
    prompt: 'Según la fachada, ¿qué tipo de inmueble está registrado?',
    choices: typeChoices(record),
    fact: `Tipo de inmueble registrado: ${titleCase(record.tipo)}.`,
    lesson: 'Clasificar bien el inmueble ayuda a escoger comparables pertinentes.',
  };
}

function findComparison(record: Appraisal) {
  const ownArea = primaryArea(record);
  const candidates = appraisals.filter((candidate) => {
    if (candidate.id === record.id || !candidate.foto) return false;
    const candidateArea = primaryArea(candidate);
    const valueRatio = candidate.valor / record.valor;
    const squareMeterRatio =
      metricValue(candidate, 'squareMeter') /
      metricValue(record, 'squareMeter');
    return (
      candidate.tipo === record.tipo &&
      candidate.regimen === record.regimen &&
      candidateArea > 0 &&
      ownArea > 0 &&
      candidateArea / ownArea >= 0.68 &&
      candidateArea / ownArea <= 1.42 &&
      Math.abs(1 - candidateArea / ownArea) > 0.08 &&
      Math.abs(1 - valueRatio) > 0.08 &&
      Math.abs(1 - squareMeterRatio) > 0.08
    );
  });
  const varied = candidates.filter((candidate) => {
    const ratio =
      metricValue(candidate, 'squareMeter') /
      metricValue(record, 'squareMeter');
    return ratio < 0.78 || ratio > 1.22;
  });
  return deterministicShuffle(
    varied.length ? varied : candidates,
    `${record.id}:comparison`,
  )[0];
}

function comparisonQuestionFor(record: Appraisal): TriviaQuestion | null {
  const comparison = findComparison(record);
  if (!comparison) return null;
  const metric = (['value', 'squareMeter'] as Metric[])[
    hashText(`${record.id}:comparison-metric`) % 2
  ];
  const firstValue = metricValue(record, metric);
  const secondValue = metricValue(comparison, metric);
  const firstWins = firstValue > secondValue;
  const questionByMetric: Record<Metric, string> = {
    value: '¿Cuál tiene mayor valor comercial?',
    squareMeter: '¿Cuál tiene el m² más costoso?',
  };
  const lessonByMetric: Record<Metric, string> = {
    value: 'Una fachada similar no implica el mismo valor comercial.',
    squareMeter: 'El valor por m² revela contrastes que el tamaño no muestra.',
  };
  return {
    eyebrow: 'Duelo de fachadas',
    prompt: questionByMetric[metric],
    visual: 'comparison',
    comparison,
    choices: [
      { id: 'comparison-a', label: 'Inmueble A', correct: firstWins },
      { id: 'comparison-b', label: 'Inmueble B', correct: !firstWins },
    ],
    fact: `A: ${metricLabel(metric, firstValue)} · B: ${metricLabel(metric, secondValue)}.`,
    lesson: lessonByMetric[metric],
  };
}

function buildQuestionPool(record: Appraisal): TriviaQuestion[] {
  const squareMeter = metricValue(record, 'squareMeter');
  const norm = normQuestionFor(record);
  const comparison = comparisonQuestionFor(record);
  const questions: TriviaQuestion[] = [
    attributeQuestionFor(record),
    {
      eyebrow: 'Piensa como avaluador',
      prompt: '¿En qué rango está el valor por m²?',
      choices: metricRangeChoices(record, 'squareMeter'),
      fact: `Valor por m² registrado: ${formatSquareMeter(squareMeter)}.`,
      lesson: 'El valor por m² permite comparar inmuebles de tamaños distintos.',
    },
    {
      eyebrow: 'Elige un rango',
      prompt: '¿En qué rango está el valor comercial de este inmueble?',
      choices: metricRangeChoices(record, 'value'),
      fact: `Valor comercial registrado: ${formatMoney(record.valor)}.`,
      lesson: 'El rango orienta; el avalúo sustenta el valor con análisis técnico y de mercado.',
    },
    {
      eyebrow: 'Norma fácil',
      prompt: norm.prompt,
      choices: norm.choices,
      fact: norm.fact,
      lesson: norm.lesson,
      source: norm.source,
      visual: 'norm',
    },
  ];
  if (comparison) questions.push(comparison);
  else {
    questions.push({
      eyebrow: 'Sector registrado',
      prompt: '¿El inmueble está en sector urbano o rural?',
      choices: deterministicShuffle<Choice>(
        [
          { id: 'sector-urban', label: 'Urbano', correct: record.sector === 'URBANO' },
          { id: 'sector-rural', label: 'Rural', correct: record.sector === 'RURAL' },
        ],
        `${record.id}:sector`,
      ),
      fact: `Sector registrado: ${titleCase(record.sector)}.`,
      lesson: 'El contexto territorial orienta la selección de comparables.',
    });
  }
  return questions;
}

function QuizChoice({
  choice,
  selected,
  answered,
  onChoose,
}: {
  choice: Choice;
  selected: boolean;
  answered: boolean;
  onChoose: () => void;
}) {
  const stateClass = answered
    ? choice.correct
      ? 'border-[#58f0bd] bg-[#103f35] text-white shadow-[0_0_28px_rgba(75,239,184,.16)]'
      : selected
        ? 'border-[#ff668f] bg-[#421c2c] text-white'
        : 'border-[#8ba6a1]/14 bg-[#0c202b]/70 text-[#718984]'
    : 'border-[#8ba6a1]/22 bg-[#0c202b] text-[#edf8f6] hover:border-[#60e7cf]/65 hover:bg-[#12313b] active:scale-[.985]';

  return (
    <button
      type="button"
      disabled={answered}
      onClick={onChoose}
      className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-base font-medium transition ${stateClass}`}
    >
      <span>{choice.label}</span>
      {answered && choice.correct && (
        <Check className="size-5 shrink-0 text-[#74ffd1]" aria-hidden="true" />
      )}
      {answered && selected && !choice.correct && (
        <X className="size-5 shrink-0 text-[#ff7a9f]" aria-hidden="true" />
      )}
    </button>
  );
}

export function AppraisalTrivia({
  record,
  onReveal,
}: {
  record: Appraisal;
  onReveal: () => void;
}) {
  const question = useMemo(() => {
    const pool = buildQuestionPool(record);
    return pool[hashText(`${record.id}:single-question`) % pool.length];
  }, [record]);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const answered = selectedChoice !== null;

  const choose = (choice: Choice) => {
    if (answered) return;
    setSelectedChoice(choice);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 pb-7 pt-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#61efd1]">
          ¿Tienes ojo de avaluador?
        </p>
        <span className="rounded-full border border-[#76ffe2]/20 bg-[#0c202b] px-3 py-1.5 text-xs font-semibold text-[#b8d2cd]">
          1 pregunta
        </span>
      </div>
      {question.visual === 'comparison' && question.comparison ? (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <FacadePhoto src={record.foto} barrio={record.barrio} label="Inmueble A" className="mb-0" eager />
          <FacadePhoto src={question.comparison.foto} barrio={question.comparison.barrio} label="Inmueble B" className="mb-0" eager />
        </div>
      ) : (
        <FacadePhoto src={record.foto} barrio={record.barrio} className="mb-6" eager />
      )}
      {question.visual === 'norm' && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#ffd66d]/25 bg-[#332b16] p-3.5">
          <div className="grid size-11 shrink-0 place-items-center rounded-lg border border-[#ffd66d]/25 bg-[#4a3b18]">
            <Scale className="size-5 text-[#ffd66d]" />
          </div>
          <p className="text-sm leading-relaxed text-[#e8d9a6]">Norma fácil sobre la actividad valuatoria en Colombia.</p>
        </div>
      )}
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5fe8cc]">
        {question.eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-medium leading-tight tracking-[-0.045em] text-white">
        {question.prompt}
      </h2>
      <div className="mt-5 grid gap-2.5">
        {question.choices.map((choice) => (
          <QuizChoice
            key={choice.id}
            choice={choice}
            selected={selectedChoice?.id === choice.id}
            answered={answered}
            onChoose={() => choose(choice)}
          />
        ))}
      </div>
      {answered && (
        <div
          className={`mt-5 rounded-2xl border p-4 ${
            selectedChoice.correct
              ? 'border-[#60f0c2]/25 bg-[#0d332d]'
              : 'border-[#ff6d94]/22 bg-[#321b29]'
          }`}
          aria-live="polite"
        >
          <p className="font-semibold text-white">
            {selectedChoice.correct
              ? '¡Correcto!'
              : `Respuesta correcta: ${question.choices.find((choice) => choice.correct)?.label}`}
          </p>
          <p className="mt-2 text-sm text-[#d0dfdc]">Dato real: {question.fact}</p>
          <p className="mt-2 text-sm text-[#72e8d0]">{question.lesson}</p>
          {question.source && (
            <p className="mt-3 text-xs text-[#a99f7e]">Referencia: {question.source}</p>
          )}
        </div>
      )}
      {answered && (
        <Button
          size="lg"
          className="mt-5 h-14 rounded-xl bg-[#13a98e] text-base font-semibold text-white hover:bg-[#18bfa0]"
          onClick={onReveal}
        >
          Ver ficha completa <Sparkles className="size-5" />
        </Button>
      )}
    </div>
  );
}
