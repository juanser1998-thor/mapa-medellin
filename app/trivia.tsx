'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  Clock3,
  Crown,
  Eye,
  Flame,
  Layers3,
  MapPin,
  RotateCcw,
  Scale,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appraisals, type Appraisal } from './data';
import { FacadePhoto } from './facade-photo';

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
  visual?: 'property' | 'comparison' | 'norm' | 'gallery';
  comparison?: Appraisal;
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

type FeedbackState = 'correct' | 'incorrect' | 'timeout' | null;

const QUESTION_SECONDS = 20;
const correctMessages = [
  '¡Boom! Sos una máquina 🔥',
  '¡Clave! Ojo de experto ✨',
  '¡Eso! La rompiste 🏆',
  '¡Precisión de perito! 🎯',
  '¡Brillante! Sumás otra victoria',
];
const incorrectMessages = [
  'Ups, esa se fue de vacaciones 😅',
  'Casi, el dato hizo pirueta 😵‍💫',
  'Tranqui, esa venía con truco 😉',
  'No pasa nada, seguimos afinando 🧭',
  'Esa se escondió muy bien 👀',
];

function randomUnusedMessage(messages: string[], usedMessages: Set<string>) {
  const available = messages.filter((message) => !usedMessages.has(message));
  const pool = available.length > 0 ? available : messages;
  const selected = pool[Math.floor(Math.random() * pool.length)];
  usedMessages.add(selected);
  return selected;
}

function AppraiserMascot({ mood = 'neutral' }: { mood?: 'neutral' | 'correct' | 'incorrect' }) {
  const label = mood === 'correct'
    ? 'Mascota Appraiser celebrando'
    : mood === 'incorrect'
      ? 'Mascota Appraiser reaccionando con humor'
      : 'Mascota Appraiser lista para jugar';

  return (
    <div className={`brand-mascot brand-mascot--${mood}`}>
      <svg viewBox="0 0 120 120" aria-label={label}>
        <ellipse className="brand-mascot__orbit" cx="60" cy="60" rx="48" ry="24" transform="rotate(-24 60 60)" />
        <path className="brand-mascot__body" d="M39 82 55 36c1.8-5 8.8-5 10.6-.2L82 82c1.3 3.8-1.5 7.8-5.6 7.8H44.6c-4.1 0-6.9-4-5.6-7.8Z" />
        <path className="brand-mascot__shine" d="M55 42c2-4 7-4 9 0l3 8H52l3-8Z" />
        {mood === 'correct' ? (
          <>
            <path className="brand-mascot__face" d="M50 64c2.5-4 6.5-4 9 0M66 64c2.5-4 6.5-4 9 0" />
            <path className="brand-mascot__mouth brand-mascot__mouth--happy" d="M53 72c4 7 12 7 16 0" />
            <path className="brand-mascot__arm" d="M42 69 29 59M79 69l13-12" />
          </>
        ) : mood === 'incorrect' ? (
          <>
            <circle className="brand-mascot__eye" cx="55" cy="63" r="2.8" />
            <path className="brand-mascot__face" d="M67 63c2-2 5-2 7 0" />
            <path className="brand-mascot__mouth" d="M53 75c4-4 8 4 12 0 3-3 5-1 7 1" />
            <path className="brand-mascot__arm" d="M42 70 31 76M79 70l10 7" />
          </>
        ) : (
          <>
            <circle className="brand-mascot__eye" cx="55" cy="63" r="2.8" />
            <circle className="brand-mascot__eye" cx="69" cy="63" r="2.8" />
            <path className="brand-mascot__mouth" d="M56 73c3 2 7 2 10 0" />
            <path className="brand-mascot__arm" d="M42 70 31 69M79 70l11-1" />
          </>
        )}
      </svg>
    </div>
  );
}

function CelebrationParticles() {
  const colors = ['#1bb58b', '#f2bd34', '#77d9c1', '#ffda6a'];
  return (
    <div className="quiz-confetti" aria-hidden="true">
      {Array.from({ length: 18 }, (_, index) => (
        <span
          key={index}
          className="quiz-confetti__piece"
          style={{
            left: `${6 + ((index * 29) % 88)}%`,
            animationDelay: `${(index % 6) * 75}ms`,
            backgroundColor: colors[index % colors.length],
          }}
        />
      ))}
    </div>
  );
}

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
  if (record.valorMetroCuadrado && record.valorMetroCuadrado > 0) {
    return record.valorMetroCuadrado;
  }
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
  const preferBelow =
    actualStart >= step &&
    hashText(`${record.id}:${metric}:similar-direction`) % 2 === 0;
  const similarStart = preferBelow ? actualStart - step : actualStart + step;
  const doubtBelow =
    value >= step * 6 &&
    hashText(`${record.id}:${metric}:doubt-direction`) % 2 === 0;
  let doubtStart = doubtBelow
    ? Math.floor((value * 0.45) / step) * step
    : Math.ceil((value * 2) / step) * step;

  while (
    doubtStart === actualStart ||
    doubtStart === similarStart ||
    Math.abs(doubtStart - actualStart) <= step
  ) {
    doubtStart += step;
  }

  let absurdStart = Math.ceil(
    Math.max(value * 12, actualStart + step * 10) / step,
  ) * step;

  while (
    absurdStart === actualStart ||
    absurdStart === similarStart ||
    absurdStart === doubtStart
  ) {
    absurdStart += step;
  }

  const candidates = [
    { id: 'correct', start: actualStart, correct: true },
    { id: 'similar', start: similarStart, correct: false },
    { id: 'discardable-doubt', start: doubtStart, correct: false },
    { id: 'absurd', start: absurdStart, correct: false },
  ];
  const choices = candidates.map((candidate) => {
    const start = candidate.start;
    const end = start + step;
    return {
      id: `range-${metric}-${candidate.id}`,
      label: `De ${metricLabel(metric, start)} a menos de ${metricLabel(metric, end)}`,
      numericValue: start + step / 2,
      correct: candidate.correct,
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

function buildUseChoices(record: Appraisal) {
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
      choices: buildUseChoices(record),
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
  const comparisonVariant = hashText(`${record.id}:comparison-metric`) % 3;
  const metric: Metric = comparisonVariant === 1 ? 'squareMeter' : 'value';
  const firstValue = metricValue(record, metric);
  const secondValue = metricValue(comparison, metric);
  const firstWins = firstValue > secondValue;
  const prompt = comparisonVariant === 2
    ? '¿Cuál de los dos inmuebles parece tener mayor valor comercial según su fachada y los acabados visibles?'
    : metric === 'squareMeter'
      ? '¿Cuál tiene el m² más costoso?'
      : '¿Cuál tiene mayor valor comercial?';
  const lesson = comparisonVariant === 2
    ? 'La apariencia orienta, pero el avalúo también considera ubicación, áreas, uso y mercado.'
    : metric === 'squareMeter'
      ? 'El valor por m² revela contrastes que el tamaño no muestra.'
      : 'Una fachada similar no implica el mismo valor comercial.';
  return {
    eyebrow: 'Duelo de fachadas',
    prompt,
    visual: 'comparison',
    comparison,
    choices: [
      { id: 'comparison-a', label: 'Inmueble A', correct: firstWins },
      { id: 'comparison-b', label: 'Inmueble B', correct: !firstWins },
    ],
    fact: `A: ${metricLabel(metric, firstValue)} · B: ${metricLabel(metric, secondValue)}.`,
    lesson,
  };
}

function areaQuestionFor(record: Appraisal): TriviaQuestion {
  const area = primaryArea(record);
  if (record.id === 'special-10' || record.id === 'special-13') {
    return {
      eyebrow: 'Analiza con rigor',
      prompt: '¿Qué información permite confirmar con precisión el área de este terreno?',
      choices: deterministicShuffle<Choice>(
        [
          {
            id: 'area-source-correct',
            label: 'Plano, levantamiento o ficha catastral verificada',
            correct: true,
          },
          {
            id: 'area-source-photos',
            label: 'Solo las fotografías de la galería',
            correct: false,
          },
          {
            id: 'area-source-neighbors',
            label: 'La altura de los edificios cercanos',
            correct: false,
          },
          {
            id: 'area-source-color',
            label: 'El color y la cobertura del suelo',
            correct: false,
          },
        ],
        `${record.id}:area-source`,
      ),
      fact: `${area.label} registrada: ${formatArea(area.value)}.`,
      lesson: 'Sin escala ni información técnica, una fotografía no permite determinar el área con precisión.',
    };
  }
  return {
    eyebrow: 'Estima el espacio',
    prompt: `¿En qué rango está su ${area.label.toLocaleLowerCase('es-CO')}?`,
    choices: metricRangeChoices(record, 'area'),
    fact: `${area.label} registrada: ${formatArea(area.value)}.`,
    lesson: 'El área influye, pero ubicación, uso y mercado también modifican el valor.',
  };
}

function buildQuestionPool(record: Appraisal): TriviaQuestion[] {
  const area = primaryArea(record);
  const squareMeter = metricValue(record, 'squareMeter');
  const norm = normQuestionFor(record);
  const comparison = comparisonQuestionFor(record);
  const questions: TriviaQuestion[] = [
    attributeQuestionFor(record),
    areaQuestionFor(record),
    {
      eyebrow: 'Piensa como avaluador',
      prompt: '¿En qué rango está el valor por m²?',
      choices: metricRangeChoices(record, 'squareMeter'),
      fact: record.valorMetroCuadrado
        ? `Valor unitario registrado: ${formatSquareMeter(squareMeter)}.`
        : `${formatMoney(record.valor)} ÷ ${formatArea(area.value)} = ${formatSquareMeter(squareMeter)}.`,
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
  if (record.categoria === 'especial' && record.caracteristicas?.length) {
    const correct = record.caracteristicas[0];
    questions.unshift({
      eyebrow: 'Identifica el inmueble',
      prompt: 'Después de observar su galería, ¿qué característica corresponde a este avalúo?',
      visual: 'gallery',
      choices: deterministicShuffle<Choice>([
        { id: 'feature-correct', label: correct, correct: true },
        { id: 'feature-a', label: 'Unidad residencial de área reducida', correct: false },
        { id: 'feature-b', label: 'Predio sin relación con actividades urbanas', correct: false },
      ], `${record.id}:feature`),
      fact: record.descripcion ?? `Característica registrada: ${correct}.`,
      lesson: 'La tipología, la escala y los espacios visibles ayudan a seleccionar comparables adecuados.',
    });
  }
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

function scoreLabel(score: number) {
  if (score === 4) return 'Ojo de perito 👑';
  if (score === 3) return 'Casi un experto';
  if (score === 2) return 'Buen ojo inmobiliario';
  return 'Mejor llamemos a un avaluador 😅';
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
      ? 'border-[#36ad8c]/45 bg-[#e4f8f1] text-[#123e36] shadow-[0_10px_28px_rgba(30,126,101,.1)]'
      : selected
        ? 'border-[#ee9a62]/50 bg-[#fff3e9] text-[#8a4b25]'
        : 'border-[#d7e2df] bg-[#f4f7f6] text-[#83918e]'
    : 'border-[#c9d9d5] bg-white text-[#183c35] shadow-sm hover:border-[#36ad97] hover:bg-[#f0faf7] active:scale-[.985]';

  return (
    <button
      type="button"
      disabled={answered}
      onClick={onChoose}
      className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-base font-medium transition ${stateClass}`}
    >
      <span>{choice.label}</span>
      {answered && choice.correct && (
        <Check className="size-5 shrink-0 text-[#128c69]" aria-hidden="true" />
      )}
      {answered && selected && !choice.correct && (
        <X className="size-5 shrink-0 text-[#c94468]" aria-hidden="true" />
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
  const questions = useMemo(() => {
    const pool = buildQuestionPool(record);
    if (record.categoria === 'especial') {
      const identification = pool.find((question) => question.visual === 'gallery');
      const rest = pool.filter((question) => question !== identification);
      return identification
        ? [identification, ...deterministicShuffle(rest, `${record.id}:four-question-round`).slice(0, 3)]
        : deterministicShuffle(pool, `${record.id}:four-question-round`).slice(0, 4);
    }
    return deterministicShuffle(pool, `${record.id}:four-question-round`).slice(0, 4);
  }, [record]);
  const [phase, setPhase] = useState<'intro' | 'questions' | 'result'>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [score, setScore] = useState(0);
  const [answerResult, setAnswerResult] = useState<FeedbackState>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const usedFeedbackMessagesRef = useRef<Set<string>>(new Set());
  const question = questions[questionIndex];
  const answered = answerResult !== null;

  const prepareAudio = useCallback(() => {
    if (!audioContextRef.current) audioContextRef.current = new AudioContext();
    if (audioContextRef.current.state === 'suspended') void audioContextRef.current.resume();
  }, []);

  const playFeedbackSound = useCallback((result: Exclude<FeedbackState, null>) => {
    const context = audioContextRef.current;
    if (!context) return;
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    const gain = context.createGain();
    gain.connect(context.destination);

    if (result === 'correct') {
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.055, now + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
      [660, 880].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        oscillator.start(now + index * 0.1);
        oscillator.stop(now + 0.2 + index * 0.1);
      });
    } else {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(240, now);
      oscillator.frequency.exponentialRampToValueAtTime(165, now + 0.22);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.23);
      oscillator.connect(gain);
      oscillator.start(now);
      oscillator.stop(now + 0.24);
    }
  }, []);

  const settleAnswer = useCallback((result: Exclude<FeedbackState, null>) => {
    setAnswerResult(result);
    if (result === 'correct') {
      setScore((current) => current + 1);
      setStreak((current) => {
        const next = current + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
      setFeedbackText(randomUnusedMessage(correctMessages, usedFeedbackMessagesRef.current));
      navigator.vibrate?.(22);
    } else {
      setStreak(0);
      setFeedbackText(randomUnusedMessage(incorrectMessages, usedFeedbackMessagesRef.current));
      navigator.vibrate?.([18, 28, 18]);
    }
    playFeedbackSound(result);
  }, [playFeedbackSound]);

  useEffect(() => {
    if (phase !== 'questions' || answered) return;
    if (timeLeft <= 0) {
      const feedbackTimer = window.setTimeout(() => settleAnswer('timeout'), 0);
      return () => window.clearTimeout(feedbackTimer);
    }
    const timer = window.setTimeout(() => {
      setTimeLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [answered, phase, settleAnswer, timeLeft]);

  const choose = (choice: Choice) => {
    if (answered) return;
    setSelectedChoice(choice);
    settleAnswer(choice.correct ? 'correct' : 'incorrect');
  };

  const advance = () => {
    if (questionIndex === questions.length - 1) {
      setPhase('result');
      return;
    }
    setQuestionIndex((current) => current + 1);
    setSelectedChoice(null);
    setAnswerResult(null);
    setFeedbackText('');
    setTimeLeft(QUESTION_SECONDS);
  };

  const reset = () => {
    setPhase('intro');
    setQuestionIndex(0);
    setSelectedChoice(null);
    setScore(0);
    setAnswerResult(null);
    setFeedbackText('');
    setTimeLeft(QUESTION_SECONDS);
    setStreak(0);
    setBestStreak(0);
    usedFeedbackMessagesRef.current.clear();
  };

  if (phase === 'intro') {
    return (
      <div className="flex h-full flex-col overflow-y-auto px-6 pb-7 pt-8">
        <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.17em] text-[#168a77]">
          <Eye className="size-4" /> Experiencia interactiva
        </div>
        <h2 className="max-w-sm text-4xl font-medium leading-[1.02] tracking-[-0.055em] text-[#102723]">
          ¿Tienes ojo de avaluador?
        </h2>
        <p className="mt-3 text-base leading-relaxed text-[#506d66]">
          Supera cuatro preguntas elegidas para este inmueble y descubre qué tan buen ojo tienes.
        </p>
        <section className="mt-5 rounded-2xl border border-[#b8ded4] bg-[#edf8f5] p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#168a77]">Información para comenzar</p>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl bg-white/80 p-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-[#168a77]" />
              <div><span className="block text-xs uppercase tracking-[0.08em] text-[#718982]">Dirección</span><strong className="mt-1 block font-medium text-[#183c35]">{record.direccion || 'Ubicación referencial disponible en la ficha'}</strong></div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-white/80 p-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-[#168a77]" />
              <div><span className="block text-xs uppercase tracking-[0.08em] text-[#718982]">Sector</span><strong className="mt-1 block font-medium text-[#183c35]">{record.barrio}{record.municipio ? ` · ${record.municipio}` : ''}</strong></div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-white/80 p-3">
              <Building2 className="mt-0.5 size-5 shrink-0 text-[#168a77]" />
              <div><span className="block text-xs uppercase tracking-[0.08em] text-[#718982]">Tipo de predio</span><strong className="mt-1 block font-medium text-[#183c35]">{titleCase(record.tipo)}</strong></div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-white/80 p-3">
              <Layers3 className="mt-0.5 size-5 shrink-0 text-[#168a77]" />
              <div><span className="block text-xs uppercase tracking-[0.08em] text-[#718982]">Régimen</span><strong className="mt-1 block font-medium text-[#183c35]">{record.regimen === 'PH' ? 'Propiedad horizontal (PH)' : 'No propiedad horizontal (NPH)'}</strong></div>
            </div>
          </div>
        </section>
        <div className="my-6">
          <FacadePhoto src={record.foto} images={record.imagenes} barrio={record.barrio} className="mb-0" eager />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm text-[#506d66]">
          <div className="rounded-xl border border-[#c9d9d5] bg-white p-3 shadow-sm">
            <strong className="block text-lg text-[#183c35]">4</strong> preguntas variadas
          </div>
          <div className="rounded-xl border border-[#c9d9d5] bg-white p-3 shadow-sm">
            <strong className="block text-lg text-[#183c35]">1</strong> resultado final
          </div>
        </div>
        <Button
          size="lg"
          className="mt-6 h-14 rounded-xl bg-[#137f6d] text-base font-semibold text-white shadow-[0_10px_24px_rgba(19,127,109,.2)] hover:bg-[#0d695a]"
          onClick={() => {
            prepareAudio();
            setTimeLeft(QUESTION_SECONDS);
            setPhase('questions');
          }}
        >
          Comenzar reto <ArrowRight className="size-5" />
        </Button>
        <p className="mt-4 text-center text-xs text-[#718982]">
          La ficha completa se revelará al terminar la ronda.
        </p>
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <div className="relative flex h-full flex-col overflow-y-auto px-6 pb-7 pt-8 text-center">
        <div className="pointer-events-none absolute inset-x-8 top-8 h-52 rounded-full bg-[#57cdb2]/15 blur-3xl" />
        <div className="result-badge relative mx-auto w-full max-w-sm shrink-0 overflow-hidden rounded-[2rem] border border-[#94d8c6] bg-[linear-gradient(145deg,#f7fffc_0%,#e1f7f0_55%,#fff5ce_100%)] p-5 shadow-[0_22px_55px_rgba(25,125,103,.2)]">
          <div className="result-badge__ring" aria-hidden="true" />
          <div className="relative flex items-center justify-center gap-4">
            <AppraiserMascot mood={score >= 3 ? 'correct' : score <= 1 ? 'incorrect' : 'neutral'} />
            <div className="text-left">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#dfbd53]/50 bg-white/75 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[#8a6800]">
                {score === 4 ? <Crown className="size-3.5" /> : <Trophy className="size-3.5" />}
                Insignia lograda
              </div>
              <p className="mt-2 text-4xl font-bold tracking-[-0.06em] text-[#123e36]">{score}/4</p>
              <p className="text-xs font-semibold text-[#55746c]">Mejor racha · {bestStreak}</p>
            </div>
          </div>
        </div>
        <p className="relative mt-5 text-xs font-semibold uppercase tracking-[0.17em] text-[#168a77]">
          Resultado final
        </p>
        <h2 className="relative mt-2 text-3xl font-medium tracking-[-0.045em] text-[#102723]">
          {scoreLabel(score)}
        </h2>
        <p className="relative mt-3 text-lg text-[#506d66]">
          Acertaste <strong className="text-[#183c35]">{score} de 4</strong> preguntas.
        </p>
        <div className="relative my-6 shrink-0 rounded-2xl border border-[#c9d9d5] bg-white p-5 shadow-sm">
          <p className="text-sm leading-relaxed text-[#506d66]">
            Cada respuesta fue construida con los datos reales disponibles para este avalúo.
          </p>
        </div>
        <div className="grid gap-3">
          <Button
            size="lg"
            className="h-14 rounded-xl bg-[#137f6d] text-base font-semibold text-white shadow-[0_10px_24px_rgba(19,127,109,.2)] hover:bg-[#0d695a]"
            onClick={onReveal}
          >
            Revelar ficha completa <Sparkles className="size-5" />
          </Button>
          <Button
            variant="ghost"
            className="text-[#506d66] hover:bg-[#edf7f4] hover:text-[#183c35]"
            onClick={reset}
          >
            <RotateCcw className="size-4" /> Jugar otra vez
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex h-full flex-col overflow-y-auto px-6 pb-7 pt-7 ${answerResult && answerResult !== 'correct' ? 'quiz-shake' : ''}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#168a77]">
          Ronda progresiva
        </p>
        <div className="flex items-center gap-2">
          <span key={`${questionIndex}-${streak}`} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-bold ${streak > 0 ? 'streak-pop border-[#f1c45b] bg-[#fff7d8] text-[#8a6500]' : 'border-[#d6e2df] bg-[#f5f8f7] text-[#78908a]'}`}>
            <Flame className="size-3.5" /> {streak}
          </span>
          <span className="rounded-full border border-[#b9d9d1] bg-[#eef8f5] px-3 py-1.5 text-xs font-semibold text-[#45655e]">
            {questionIndex + 1} de 4
          </span>
        </div>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-[#dceae6]" aria-hidden="true">
        <div
          className="h-full rounded-full bg-[#1b9b84] transition-[width] duration-300"
          style={{ width: `${((questionIndex + 1) / 4) * 100}%` }}
        />
      </div>
      <div className={`mb-5 flex items-center gap-3 rounded-xl border px-3 py-2.5 ${timeLeft <= 5 && !answered ? 'border-[#efb37f] bg-[#fff3e8]' : 'border-[#c9ded8] bg-white/85'}`}>
        <Clock3 className={`size-4 shrink-0 ${timeLeft <= 5 && !answered ? 'timer-urgent text-[#cf6d34]' : 'text-[#168a77]'}`} />
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#dce9e5]">
          <div
            className={`h-full rounded-full transition-[width,background-color] duration-300 ${timeLeft <= 5 ? 'bg-[#e8894f]' : 'bg-[#23a98c]'}`}
            style={{ width: `${(timeLeft / QUESTION_SECONDS) * 100}%` }}
          />
        </div>
        <span role="timer" aria-label={`${timeLeft} segundos restantes`} className="min-w-8 text-right text-sm font-bold tabular-nums text-[#294c44]">
          {timeLeft}s
        </span>
      </div>
      {question.visual === 'comparison' && question.comparison ? (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <FacadePhoto src={record.foto} images={record.imagenes} barrio={record.barrio} label="Inmueble A" className="mb-0" eager />
          <FacadePhoto src={question.comparison.foto} images={question.comparison.imagenes} barrio={question.comparison.barrio} label="Inmueble B" className="mb-0" eager />
        </div>
      ) : (
        <FacadePhoto src={record.foto} images={record.imagenes} barrio={record.barrio} className="mb-6" eager />
      )}
      {question.visual === 'norm' && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#ead28a] bg-[#fff8df] p-3.5">
          <div className="grid size-11 shrink-0 place-items-center rounded-lg border border-[#e2c568] bg-[#fff1bd]">
            <Scale className="size-5 text-[#916d00]" />
          </div>
          <p className="text-sm leading-relaxed text-[#6f5913]">Norma fácil sobre la actividad valuatoria en Colombia.</p>
        </div>
      )}
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#168a77]">
        {question.eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-medium leading-tight tracking-[-0.045em] text-[#102723]">
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
          className={`quiz-feedback relative mt-5 shrink-0 overflow-hidden rounded-2xl border p-4 ${
            answerResult === 'correct'
              ? 'quiz-feedback--correct border-[#54b99a]/45 bg-[#e7f8f1]'
              : 'quiz-feedback--incorrect border-[#efaa74]/50 bg-[#fff2e7]'
          }`}
          aria-live="polite"
        >
          {answerResult === 'correct' && <CelebrationParticles />}
          <div className="relative flex items-start gap-3">
            <AppraiserMascot mood={answerResult === 'correct' ? 'correct' : 'incorrect'} />
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-lg font-bold leading-tight text-[#183c35]">{feedbackText}</p>
              {answerResult !== 'correct' && (
                <p className="mt-2 rounded-lg bg-white/75 px-3 py-2 text-sm font-semibold text-[#75431f]">
                  {answerResult === 'timeout' ? 'Se acabó el tiempo · ' : 'La correcta era · '}
                  {question.choices.find((choice) => choice.correct)?.label}
                </p>
              )}
              <p className="mt-2 text-sm text-[#405d56]">Dato real: {question.fact}</p>
              <p className="mt-2 text-sm text-[#147865]">{question.lesson}</p>
              {question.source && (
                <p className="mt-3 text-xs text-[#7d7353]">Referencia: {question.source}</p>
              )}
            </div>
          </div>
        </div>
      )}
      {answered && (
        <Button
          size="lg"
          className="mt-5 h-14 shrink-0 rounded-xl bg-[#137f6d] text-base font-semibold text-white shadow-[0_10px_24px_rgba(19,127,109,.2)] hover:bg-[#0d695a]"
          onClick={advance}
        >
          {questionIndex === 3 ? 'Ver resultado' : 'Siguiente pregunta'}
          <ArrowRight className="size-5" />
        </Button>
      )}
    </div>
  );
}
