'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  Crown,
  Eye,
  RotateCcw,
  Scale,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Progress,
  ProgressLabel,
} from '@/components/ui/progress';
import { appraisals, type Appraisal } from './data';

type Metric = 'area' | 'squareMeter' | 'value';

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
  measuresValueRange?: boolean;
};

type NormQuestion = {
  prompt: string;
  choices: Choice[];
  fact: string;
  lesson: string;
  source: string;
};

type AreaDatum = {
  value: number;
  label: 'Área privada' | 'Área construida' | 'Área de terreno';
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

function formatArea(value: number) {
  return `${value.toLocaleString('es-CO', { maximumFractionDigits: 2 })} m²`;
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

function primaryArea(record: Appraisal): AreaDatum {
  const privateArea = record.areaPrivada ?? 0;
  const builtArea = record.areaConstruida ?? 0;
  const landArea = record.areaTerreno ?? 0;

  if (record.tipo === 'APARTAMENTO' && privateArea > 0) {
    return { value: privateArea, label: 'Área privada' };
  }
  if (record.tipo === 'CASA' && builtArea > 0) {
    return { value: builtArea, label: 'Área construida' };
  }
  if (privateArea > 0) return { value: privateArea, label: 'Área privada' };
  if (builtArea > 0) return { value: builtArea, label: 'Área construida' };
  return { value: landArea, label: 'Área de terreno' };
}

function metricValue(record: Appraisal, metric: Metric) {
  if (metric === 'area') return primaryArea(record).value;
  if (metric === 'value') return record.valor;
  const area = primaryArea(record).value;
  return area > 0 ? record.valor / area : 0;
}

function metricLabel(metric: Metric, value: number) {
  if (metric === 'area') return formatArea(value);
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
  if (metric === 'area') {
    if (value < 50) return 10;
    if (value < 120) return 20;
    if (value < 300) return 50;
    if (value < 800) return 100;
    return 250;
  }
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
  {
    prompt: 'En propiedad horizontal, ¿qué área considera el avalúo?',
    choices: [
      { id: 'ph-private-area', label: 'El área privada y los derechos de copropiedad', correct: true },
      { id: 'ph-whole-lot', label: 'Todo el lote del conjunto como área exclusiva', correct: false },
      { id: 'ph-common-only', label: 'Únicamente las zonas comunes', correct: false },
      { id: 'ph-facade-only', label: 'Solo el área visible de la fachada', correct: false },
    ],
    fact: 'Se consideran las áreas privadas y los derechos derivados de los coeficientes de copropiedad.',
    lesson: 'En PH, el área privada no equivale a todas las áreas comunes del conjunto.',
    source: 'Decreto 1420 de 1998, artículo 21.',
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
  const ownArea = primaryArea(record).value;
  const candidates = appraisals.filter((candidate) => {
    if (candidate.id === record.id || !candidate.foto) return false;
    const candidateArea = primaryArea(candidate).value;
    const valueRatio = candidate.valor / record.valor;
    const squareMeterRatio =
      metricValue(candidate, 'squareMeter') /
      metricValue(record, 'squareMeter');
    return (
      candidate.tipo === record.tipo &&
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
  const metric = (['value', 'squareMeter', 'area'] as Metric[])[
    hashText(`${record.id}:comparison-metric`) % 3
  ];
  const firstValue = metricValue(record, metric);
  const secondValue = metricValue(comparison, metric);
  const firstWins = firstValue > secondValue;
  const questionByMetric: Record<Metric, string> = {
    value: '¿Cuál tiene mayor valor comercial?',
    squareMeter: '¿Cuál tiene el m² más costoso?',
    area: '¿Cuál tiene mayor área registrada?',
  };
  const lessonByMetric: Record<Metric, string> = {
    value: 'Una fachada similar no implica el mismo valor comercial.',
    squareMeter: 'El valor por m² revela contrastes que el tamaño no muestra.',
    area: 'El inmueble más grande no siempre es el de mayor valor.',
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

function buildQuestions(record: Appraisal): TriviaQuestion[] {
  const area = primaryArea(record);
  const squareMeter = metricValue(record, 'squareMeter');
  const norm = normQuestionFor(record);
  const comparison = comparisonQuestionFor(record);
  const questions: TriviaQuestion[] = [
    attributeQuestionFor(record),
    {
      eyebrow: 'Estima el espacio',
      prompt: `¿En qué rango está su ${area.label.toLocaleLowerCase('es-CO')}?`,
      choices: metricRangeChoices(record, 'area'),
      fact: `${area.label} registrada: ${formatArea(area.value)}.`,
      lesson: 'El área influye, pero ubicación, uso y mercado también modifican el valor.',
    },
    {
      eyebrow: 'Piensa como avaluador',
      prompt: '¿En qué rango está el valor por m²?',
      choices: metricRangeChoices(record, 'squareMeter'),
      fact: `${formatMoney(record.valor)} ÷ ${formatArea(area.value)} = ${formatSquareMeter(squareMeter)}.`,
      lesson: 'El valor por m² permite comparar inmuebles de tamaños distintos.',
    },
    {
      eyebrow: 'Elige un rango',
      prompt: '¿En qué rango está el valor comercial de este inmueble?',
      choices: metricRangeChoices(record, 'value'),
      fact: `Valor comercial registrado: ${formatMoney(record.valor)}.`,
      lesson: 'El rango orienta; el avalúo sustenta el valor con análisis técnico y de mercado.',
      measuresValueRange: true,
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
  return deterministicShuffle(questions, `${record.id}:round-order`);
}

function scoreLabel(score: number, total: number) {
  if (score === total) return 'Ojo de perito 👑';
  if (score >= total - 1) return 'Casi un experto';
  if (score >= Math.ceil(total / 2)) return 'Buen ojo inmobiliario';
  return 'Mejor llamemos a un avaluador 😅';
}

function FacadeFrame({ record, label }: { record: Appraisal; label?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="relative overflow-hidden rounded-2xl border border-[#76ffe2]/20 bg-[#0c202b]">
      {label && (
        <figcaption className="absolute left-3 top-3 z-10 rounded-full border border-white/15 bg-[#07151e]/88 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md">
          {label}
        </figcaption>
      )}
      {!record.foto || failed ? (
        <div className="grid aspect-[4/3] place-items-center text-[#93aaa6]">
          <div className="text-center">
            <Building2 className="mx-auto mb-2 size-8" />
            <span className="text-sm">Fachada no disponible</span>
          </div>
        </div>
      ) : (
        <img
          src={record.foto}
          alt={`Fachada de un inmueble en ${record.barrio}`}
          className="aspect-[4/3] w-full object-cover"
          loading="eager"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06131d] via-[#06131d]/72 to-transparent px-4 pb-4 pt-12">
        <p className="text-sm font-medium text-white">{record.barrio}</p>
      </div>
    </figure>
  );
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
  const questions = useMemo(() => buildQuestions(record), [record]);
  const [phase, setPhase] = useState<'intro' | 'questions' | 'result'>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [score, setScore] = useState(0);
  const [valueCloseness, setValueCloseness] = useState(0);

  const question = questions[questionIndex];
  const answered = selectedChoice !== null;

  const reset = () => {
    setPhase('intro');
    setQuestionIndex(0);
    setSelectedChoice(null);
    setScore(0);
    setValueCloseness(0);
  };

  const choose = (choice: Choice) => {
    if (answered) return;
    setSelectedChoice(choice);
    if (choice.correct) setScore((current) => current + 1);
    if (question.measuresValueRange && choice.numericValue) {
      const difference = Math.abs(choice.numericValue - record.valor) / record.valor;
      setValueCloseness(Math.max(0, Math.round((1 - difference) * 100)));
    }
  };

  const advance = () => {
    if (questionIndex === questions.length - 1) {
      setPhase('result');
      return;
    }
    setQuestionIndex((current) => current + 1);
    setSelectedChoice(null);
  };

  if (phase === 'intro') {
    return (
      <div className="flex h-full flex-col overflow-y-auto px-6 pb-7 pt-8">
        <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.17em] text-[#61efd1]">
          <Eye className="size-4" /> Experiencia interactiva
        </div>
        <h2 className="max-w-sm text-4xl font-medium leading-[1.02] tracking-[-0.055em] text-white">
          ¿Tienes ojo de avaluador?
        </h2>
        <p className="mt-3 text-base leading-relaxed text-[#abc2bf]">
          Observa las fachadas y supera una ronda diferente para cada inmueble, siempre con datos reales.
        </p>
        <div className="my-6">
          <FacadeFrame record={record} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm text-[#b6cbc7]">
          <div className="rounded-xl border border-[#759f98]/18 bg-[#0c202b] p-3">
            <strong className="block text-lg text-white">{questions.length}</strong> preguntas variadas
          </div>
          <div className="rounded-xl border border-[#759f98]/18 bg-[#0c202b] p-3">
            <strong className="block text-lg text-white">3</strong> retos por rangos
          </div>
        </div>
        <Button
          size="lg"
          className="mt-6 h-14 rounded-xl bg-[#13a98e] text-base font-semibold text-white shadow-[0_0_34px_rgba(28,215,180,.2)] hover:bg-[#18bfa0]"
          onClick={() => setPhase('questions')}
        >
          Comenzar reto <ArrowRight className="size-5" />
        </Button>
        <p className="mt-4 text-center text-xs text-[#78928e]">
          La ficha completa se revelará al terminar la ronda.
        </p>
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <div className="relative flex h-full flex-col overflow-y-auto px-6 pb-7 pt-8 text-center">
        <div className="pointer-events-none absolute inset-x-8 top-8 h-52 rounded-full bg-[#24e8bd]/10 blur-3xl" />
        <div className="relative mx-auto grid size-20 place-items-center rounded-full border border-[#7dffe2]/35 bg-[#0d3b36] shadow-[0_0_44px_rgba(42,239,195,.25)]">
          {score === questions.length ? <Crown className="size-9 text-[#ffd65a]" /> : <Trophy className="size-9 text-[#67f2d4]" />}
        </div>
        <p className="relative mt-5 text-xs font-semibold uppercase tracking-[0.17em] text-[#63e9ce]">
          Resultado final
        </p>
        <h2 className="relative mt-2 text-3xl font-medium tracking-[-0.045em] text-white">
          {scoreLabel(score, questions.length)}
        </h2>
        <p className="relative mt-3 text-lg text-[#c7d9d6]">
          Acertaste <strong className="text-white">{score} de {questions.length}</strong> preguntas.
        </p>
        <div className="relative my-6 rounded-2xl border border-[#78ffe1]/20 bg-[#0c202b]/90 p-5">
          <p className="text-sm text-[#94ada9]">El punto medio del rango elegido se acercó un</p>
          <p className="mt-1 text-5xl font-medium tracking-[-0.06em] text-[#6dffd9]">
            {valueCloseness}%
          </p>
          <p className="mt-2 text-sm text-[#c0d1ce]">al valor del avalúo.</p>
        </div>
        <div className="grid gap-3">
          <Button
            size="lg"
            className="h-14 rounded-xl bg-[#13a98e] text-base font-semibold text-white hover:bg-[#18bfa0]"
            onClick={onReveal}
          >
            Revelar ficha completa <Sparkles className="size-5" />
          </Button>
          <Button
            variant="ghost"
            className="text-[#9bb3af] hover:bg-white/5 hover:text-white"
            onClick={reset}
          >
            <RotateCcw className="size-4" /> Jugar otra vez
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 pb-7 pt-7">
      <Progress value={((questionIndex + 1) / questions.length) * 100} className="mb-5 text-[#b7cbc8]">
        <ProgressLabel>Ronda progresiva</ProgressLabel>
        <span className="ml-auto text-sm tabular-nums">
          {questionIndex + 1} de {questions.length}
        </span>
      </Progress>
      {question.visual === 'comparison' && question.comparison ? (
        <div className="mb-5 grid grid-cols-2 gap-3">
          <FacadeFrame record={record} label="Inmueble A" />
          <FacadeFrame record={question.comparison} label="Inmueble B" />
        </div>
      ) : question.visual === 'norm' ? (
        <div className="mb-5 flex items-center gap-4 rounded-2xl border border-[#ffd66d]/25 bg-[#332b16] p-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-[#ffd66d]/25 bg-[#4a3b18]">
            <Scale className="size-7 text-[#ffd66d]" />
          </div>
          <p className="text-sm leading-relaxed text-[#e8d9a6]">
            Una pregunta sencilla sobre la actividad valuatoria en Colombia.
          </p>
        </div>
      ) : (
        <div className="mb-5 overflow-hidden rounded-2xl">
          <FacadeFrame record={record} />
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
          onClick={advance}
        >
          {questionIndex === questions.length - 1 ? 'Ver resultado' : 'Siguiente pregunta'}
          <ArrowRight className="size-5" />
        </Button>
      )}
    </div>
  );
}
