'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  Crown,
  Eye,
  RotateCcw,
  Sparkles,
  Swords,
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

function roundedEstimate(actual: number, metric: Metric, factor: number) {
  const step =
    metric === 'area'
      ? actual < 25
        ? 0.5
        : actual < 150
          ? 1
          : 5
      : metric === 'value'
        ? 5_000_000
        : 50_000;
  return Math.max(step, Math.round((actual * factor) / step) * step);
}

function plausibleMetricChoices(
  record: Appraisal,
  metric: Metric,
  questionIndex: number,
) {
  const actual = metricValue(record, metric);
  const actualLabel = metricLabel(metric, actual);
  const sameType = appraisals.filter(
    (candidate) => candidate.id !== record.id && candidate.tipo === record.tipo,
  );
  const allOthers = appraisals.filter((candidate) => candidate.id !== record.id);
  const candidates = deterministicShuffle(
    [...sameType, ...allOthers],
    `${record.id}:${metric}:candidates`,
  );
  const selected: number[] = [];
  const labels = new Set([actualLabel]);

  const collect = (minimumRatio: number, maximumRatio: number, minimumGap: number) => {
    for (const candidate of candidates) {
      if (selected.length === 3) break;
      const value = metricValue(candidate, metric);
      if (!(value > 0) || !(actual > 0)) continue;
      const ratio = value / actual;
      if (
        ratio < minimumRatio ||
        ratio > maximumRatio ||
        Math.abs(1 - ratio) < minimumGap
      ) {
        continue;
      }
      const label = metricLabel(metric, value);
      if (labels.has(label)) continue;
      labels.add(label);
      selected.push(value);
    }
  };

  collect(0.58, 1.72, 0.09);
  if (selected.length < 3) collect(0.38, 2.35, 0.055);
  if (selected.length < 3) {
    const fallbackFactors = deterministicShuffle(
      [0.72, 0.84, 1.16, 1.32, 1.48],
      `${record.id}:${metric}:estimates`,
    );
    for (const factor of fallbackFactors) {
      if (selected.length === 3) break;
      const value = roundedEstimate(actual, metric, factor);
      const label = metricLabel(metric, value);
      if (labels.has(label)) continue;
      labels.add(label);
      selected.push(value);
    }
  }

  const choices: Choice[] = [
    {
      id: `correct-${metric}`,
      label: actualLabel,
      numericValue: actual,
      correct: true,
    },
    ...selected.slice(0, 3).map((value, index) => ({
      id: `option-${metric}-${index}`,
      label: metricLabel(metric, value),
      numericValue: value,
      correct: false,
    })),
  ];

  return deterministicShuffle(choices, `${record.id}:${metric}:${questionIndex}`);
}

function typeChoices(record: Appraisal) {
  if (record.tipo === 'APARTAMENTO' || record.tipo === 'CASA') {
    return deterministicShuffle<Choice>(
      [
        {
          id: 'type-apartment',
          label: 'Apartamento',
          correct: record.tipo === 'APARTAMENTO',
        },
        {
          id: 'type-house',
          label: 'Casa',
          correct: record.tipo === 'CASA',
        },
      ],
      `${record.id}:type`,
    );
  }

  const otherTypes = deterministicShuffle(
    [...new Set(appraisals.map((item) => item.tipo))].filter(
      (type) => type !== record.tipo,
    ),
    `${record.id}:other-types`,
  ).slice(0, 3);

  return deterministicShuffle<Choice>(
    [record.tipo, ...otherTypes].map((type) => ({
      id: `type-${type}`,
      label: titleCase(type),
      correct: type === record.tipo,
    })),
    `${record.id}:type-options`,
  );
}

function buildQuestions(record: Appraisal): TriviaQuestion[] {
  const area = primaryArea(record);
  const squareMeter = metricValue(record, 'squareMeter');
  return [
    {
      eyebrow: 'Lee la fachada',
      prompt:
        record.tipo === 'APARTAMENTO' || record.tipo === 'CASA'
          ? '¿Apartamento o casa?'
          : '¿Qué tipo de inmueble crees que es?',
      choices: typeChoices(record),
      fact: `Tipo registrado: ${titleCase(record.tipo)}.`,
      lesson:
        'La tipología define qué áreas y comparables pesan más en el avalúo.',
    },
    {
      eyebrow: 'Estima el espacio',
      prompt: `¿Cuánto crees que mide su ${area.label.toLocaleLowerCase('es-CO')}?`,
      choices: plausibleMetricChoices(record, 'area', 1),
      fact: `${area.label} registrada: ${formatArea(area.value)}.`,
      lesson:
        'El área influye, pero ubicación, uso y mercado también modifican el valor.',
    },
    {
      eyebrow: 'Piensa como avaluador',
      prompt: '¿Cuánto crees que vale el m²?',
      choices: plausibleMetricChoices(record, 'squareMeter', 2),
      fact: `${formatMoney(record.valor)} ÷ ${formatArea(area.value)} = ${formatSquareMeter(squareMeter)}.`,
      lesson:
        'El valor por m² permite comparar inmuebles de tamaños distintos.',
    },
    {
      eyebrow: 'Tu estimación final',
      prompt: '¿Cuánto crees que vale este inmueble?',
      choices: plausibleMetricChoices(record, 'value', 3),
      fact: `Valor comercial registrado: ${formatMoney(record.valor)}.`,
      lesson:
        'El valor comercial integra características físicas, ubicación y evidencia de mercado.',
    },
  ];
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

function scoreLabel(score: number) {
  if (score === 4) return 'Ojo de perito 👑';
  if (score === 3) return 'Casi un experto';
  if (score === 2) return 'Buen ojo inmobiliario';
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
  const comparison = useMemo(() => findComparison(record), [record]);
  const [phase, setPhase] = useState<'intro' | 'questions' | 'result' | 'bonus'>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [score, setScore] = useState(0);
  const [valueCloseness, setValueCloseness] = useState(0);
  const [bonusChoice, setBonusChoice] = useState<'a' | 'b' | null>(null);

  const question = questions[questionIndex];
  const answered = selectedChoice !== null;

  const reset = () => {
    setPhase('intro');
    setQuestionIndex(0);
    setSelectedChoice(null);
    setScore(0);
    setValueCloseness(0);
    setBonusChoice(null);
  };

  const choose = (choice: Choice) => {
    if (answered) return;
    setSelectedChoice(choice);
    if (choice.correct) setScore((current) => current + 1);
    if (questionIndex === questions.length - 1 && choice.numericValue) {
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

  const comparisonMetric: Metric = hashText(record.id) % 2 === 0 ? 'value' : 'squareMeter';
  const comparisonA = metricValue(record, comparisonMetric);
  const comparisonB = comparison ? metricValue(comparison, comparisonMetric) : 0;
  const comparisonCorrect: 'a' | 'b' = comparisonA >= comparisonB ? 'a' : 'b';

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
          Observa la fachada y supera cuatro estimaciones basadas en este inmueble real.
        </p>
        <div className="my-6">
          <FacadeFrame record={record} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm text-[#b6cbc7]">
          <div className="rounded-xl border border-[#759f98]/18 bg-[#0c202b] p-3">
            <strong className="block text-lg text-white">4</strong> preguntas
          </div>
          <div className="rounded-xl border border-[#759f98]/18 bg-[#0c202b] p-3">
            <strong className="block text-lg text-white">1</strong> insignia final
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
          {score === 4 ? <Crown className="size-9 text-[#ffd65a]" /> : <Trophy className="size-9 text-[#67f2d4]" />}
        </div>
        <p className="relative mt-5 text-xs font-semibold uppercase tracking-[0.17em] text-[#63e9ce]">
          Resultado final
        </p>
        <h2 className="relative mt-2 text-3xl font-medium tracking-[-0.045em] text-white">
          {scoreLabel(score)}
        </h2>
        <p className="relative mt-3 text-lg text-[#c7d9d6]">
          Acertaste <strong className="text-white">{score} de 4</strong> preguntas.
        </p>
        <div className="relative my-6 rounded-2xl border border-[#78ffe1]/20 bg-[#0c202b]/90 p-5">
          <p className="text-sm text-[#94ada9]">Tu estimación de valor se acercó un</p>
          <p className="mt-1 text-5xl font-medium tracking-[-0.06em] text-[#6dffd9]">
            {valueCloseness}%
          </p>
          <p className="mt-2 text-sm text-[#c0d1ce]">al valor del avalúo.</p>
        </div>
        <div className="grid gap-3">
          {comparison && (
            <Button
              size="lg"
              variant="outline"
              className="h-14 rounded-xl border-[#67e9d0]/30 bg-[#102a34] text-white hover:bg-[#173944] hover:text-white"
              onClick={() => setPhase('bonus')}
            >
              <Swords className="size-5" /> Duelo de fachadas
            </Button>
          )}
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

  if (phase === 'bonus' && comparison) {
    const bonusAnswered = bonusChoice !== null;
    const formatComparison = (value: number) =>
      comparisonMetric === 'value' ? formatMoney(value) : formatSquareMeter(value);
    return (
      <div className="flex h-full flex-col overflow-y-auto px-6 pb-7 pt-8">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.17em] text-[#61efd1]">
          <Swords className="size-4" /> Duelo de fachadas
        </div>
        <h2 className="text-3xl font-medium leading-tight tracking-[-0.045em] text-white">
          {comparisonMetric === 'value'
            ? '¿Cuál tiene mayor valor comercial?'
            : '¿Cuál tiene el m² más costoso?'}
        </h2>
        <div className="my-5 grid grid-cols-2 gap-3">
          <FacadeFrame record={record} label="Inmueble A" />
          <FacadeFrame record={comparison} label="Inmueble B" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(['a', 'b'] as const).map((choice) => {
            const correct = choice === comparisonCorrect;
            const selected = choice === bonusChoice;
            return (
              <button
                key={choice}
                type="button"
                disabled={bonusAnswered}
                onClick={() => setBonusChoice(choice)}
                className={`min-h-14 rounded-xl border px-4 py-3 text-base font-semibold transition ${
                  bonusAnswered
                    ? correct
                      ? 'border-[#58f0bd] bg-[#103f35] text-white'
                      : selected
                        ? 'border-[#ff668f] bg-[#421c2c] text-white'
                        : 'border-white/10 bg-[#0c202b]/60 text-[#6f8783]'
                    : 'border-[#8ba6a1]/22 bg-[#0c202b] text-white hover:border-[#60e7cf]/65 hover:bg-[#12313b]'
                }`}
              >
                Inmueble {choice.toUpperCase()}
              </button>
            );
          })}
        </div>
        {bonusAnswered && (
          <div className="mt-5 rounded-2xl border border-[#73ffe1]/22 bg-[#0c292e] p-4">
            <p className="font-semibold text-white">
              {bonusChoice === comparisonCorrect ? '¡Buen ojo!' : `La respuesta era el inmueble ${comparisonCorrect.toUpperCase()}.`}
            </p>
            <div className="mt-3 grid gap-1 text-sm text-[#bfd1ce]">
              <p>A: {formatComparison(comparisonA)}</p>
              <p>B: {formatComparison(comparisonB)}</p>
            </div>
            <p className="mt-3 text-sm text-[#74e9d0]">
              {comparisonMetric === 'value'
                ? 'Una fachada similar no implica el mismo valor comercial.'
                : 'El valor por m² revela contrastes que el tamaño no muestra.'}
            </p>
          </div>
        )}
        {bonusAnswered && (
          <Button
            size="lg"
            className="mt-5 h-14 rounded-xl bg-[#13a98e] text-base font-semibold text-white hover:bg-[#18bfa0]"
            onClick={onReveal}
          >
            Revelar ficha completa <Sparkles className="size-5" />
          </Button>
        )}
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
      <div className="mb-5 overflow-hidden rounded-2xl">
        <FacadeFrame record={record} />
      </div>
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
