'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import type { Feature, FeatureCollection, Point } from 'geojson';
import {
  BadgeDollarSign,
  BrainCircuit,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Compass,
  LocateFixed,
  Landmark as LandmarkIcon,
  Leaf,
  MapPin,
  Pause,
  Palette,
  Play,
  Route,
  Sparkles,
  Trophy,
  UsersRound,
  Waves,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { appraisals, type Appraisal } from './data';
import { locationPin } from './map-pin';
import { landmarkPin } from './landmark-pin';
import { FacadePhoto } from './facade-photo';
import { AppraisalTrivia } from './trivia';
import { IntroScreen } from './intro-screen';
import { LandmarkChallenge } from './landmark-challenge';
import { LandmarkDirectory } from './landmark-directory';
import { AppraisalDirectory } from './appraisal-directory';
import { landmarks, type Landmark } from './landmarks';
import 'maplibre-gl/dist/maplibre-gl.css';

type AppraisalGroup = {
  key: string;
  lng: number;
  lat: number;
  records: Appraisal[];
};

const cityView = {
  center: [-75.577, 6.245] as [number, number],
  zoom: 12.4,
  pitch: 58,
  bearing: -24,
};
const valueRanges = [
  { label: 'Menos de $4.000 M', max: 4_000_000_000, color: '#00edb0' },
  { label: '$4.000 M a menos de $10.000 M', max: 10_000_000_000, color: '#16bcff' },
  { label: '$10.000 M a menos de $25.000 M', max: 25_000_000_000, color: '#ffb52e' },
  { label: '$25.000 M o más', max: Infinity, color: '#ff398b' },
];

const pointOfInterestLegend = [
  { key: 'art', label: 'Arte y cultura', color: '#7c5ce7', Icon: Palette },
  { key: 'heritage', label: 'Patrimonio', color: '#b97824', Icon: LandmarkIcon },
  { key: 'river', label: 'Río y espacio público', color: '#168fc4', Icon: Waves },
  { key: 'nature', label: 'Naturaleza', color: '#22a878', Icon: Leaf },
  { key: 'community', label: 'Comunidad', color: '#e34f7a', Icon: UsersRound },
  { key: 'mobility', label: 'Movilidad', color: '#ef8c2f', Icon: Route },
] as const;

const landmarkGeojson: FeatureCollection<Point> = {
  type: 'FeatureCollection',
  features: landmarks.map((landmark) => ({
    type: 'Feature',
    properties: {
      id: landmark.id,
      name: landmark.shortName,
      icon: `landmark-${landmark.id}`,
    },
    geometry: {
      type: 'Point',
      coordinates: landmark.coordinates,
    },
  })),
};

function colorForValue(value: number) {
  return valueRanges.find((range) => value < range.max)?.color ?? '#ff398b';
}

function offsetDuplicatePoint(
  lng: number,
  lat: number,
  index: number,
  count: number,
): [number, number] {
  if (count === 1) return [lng, lat];
  const radiusMeters = count > 5 ? 14 : 10;
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  const latOffset = (Math.sin(angle) * radiusMeters) / 111320;
  const lngOffset =
    (Math.cos(angle) * radiusMeters) /
    (111320 * Math.cos((lat * Math.PI) / 180));
  return [lng + lngOffset, lat + latOffset];
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatArea(value: number | null, unit = 'm²') {
  return value === null ? 'Sin dato' : `${value.toLocaleString('es-CO', { maximumFractionDigits: 2 })} ${unit}`;
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const tourPositionRef = useRef({
    stopIndex: 0,
    appraisalIndex: 0,
    landmarkIndex: 0,
  });
  const [ready, setReady] = useState(false);
  const [introOpen, setIntroOpen] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [recordIndex, setRecordIndex] = useState(0);
  const [touring, setTouring] = useState(false);
  const [viewMode, setViewMode] = useState<'menu' | 'quiz' | 'details'>('menu');
  const [activeLandmarkId, setActiveLandmarkId] = useState<string | null>(null);
  const [tourLandmarkId, setTourLandmarkId] = useState<string | null>(null);
  const [tourAppraisalId, setTourAppraisalId] = useState<string | null>(null);
  const [landmarkDirectoryOpen, setLandmarkDirectoryOpen] = useState(false);
  const [appraisalDirectoryOpen, setAppraisalDirectoryOpen] = useState(false);
  const [returnToTourAfterQuiz, setReturnToTourAfterQuiz] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  const groups = useMemo<AppraisalGroup[]>(() => {
    const grouped = new Map<string, AppraisalGroup>();
    for (const item of appraisals) {
      const key = `${item.lng.toFixed(6)},${item.lat.toFixed(6)}`;
      const current = grouped.get(key);
      if (current) current.records.push(item);
      else
        grouped.set(key, {
          key,
          lng: item.lng,
          lat: item.lat,
          records: [item],
        });
    }
    return [...grouped.values()];
  }, []);

  const geojson = useMemo<FeatureCollection<Point>>(() => {
    const features: Array<Feature<Point>> = [];
    for (const group of groups) {
      group.records.forEach((record, index) => {
        features.push({
          type: 'Feature',
          properties: {
            id: record.id,
            key: group.key,
            color: colorForValue(record.valor),
            icon: `pin-${colorForValue(record.valor).slice(1)}`,
          },
          geometry: {
            type: 'Point',
            coordinates: offsetDuplicatePoint(
              group.lng,
              group.lat,
              index,
              group.records.length,
            ),
          },
        });
      });
    }
    return { type: 'FeatureCollection', features };
  }, [groups]);

  const selectedGroup =
    groups.find((group) => group.key === selectedKey) ?? null;
  const selected = selectedGroup?.records[recordIndex] ?? null;
  const activeLandmark =
    landmarks.find((landmark) => landmark.id === activeLandmarkId) ?? null;
  const tourLandmark =
    landmarks.find((landmark) => landmark.id === tourLandmarkId) ?? null;
  const tourAppraisal =
    appraisals.find((appraisal) => appraisal.id === tourAppraisalId) ?? null;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/bright',
      ...cityView,
      canvasContextAttributes: { antialias: true },
      maxPitch: 78,
    });
    mapRef.current = map;
    const readyFallback = window.setTimeout(() => setReady(true), 6000);
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      'bottom-right',
    );

    map.once('style.load', () => {
      window.clearTimeout(readyFallback);
      setReady(true);
      map.setLight({
        anchor: 'viewport',
        color: '#f8fffd',
        intensity: 0.5,
        position: [1.15, 210, 35],
      });
      const vectorSource = Object.entries(map.getStyle().sources).find(
        ([, source]) => source.type === 'vector',
      )?.[0];
      if (vectorSource && !map.getLayer('city-buildings-3d')) {
        try {
          map.addLayer(
            {
              id: 'city-buildings-3d',
              source: vectorSource,
              'source-layer': 'building',
              type: 'fill-extrusion',
              minzoom: 12.2,
              paint: {
                'fill-extrusion-color': '#b9c9c5',
                'fill-extrusion-height': [
                  '*',
                  [
                    'coalesce',
                    ['get', 'render_height'],
                    ['get', 'height'],
                    18,
                  ],
                  1.2,
                ],
                'fill-extrusion-base': [
                  'coalesce',
                  ['get', 'render_min_height'],
                  ['get', 'min_height'],
                  0,
                ],
                'fill-extrusion-opacity': 1,
                'fill-extrusion-opacity-transition': { duration: 0, delay: 0 },
                'fill-extrusion-vertical-gradient': false,
              },
            },
          );
        } catch {
          // El mapa continúa con la capa base si el proveedor cambia su esquema.
        }
      }

      map.addSource('avaluos-medellin', {
        type: 'geojson', data: geojson,
        cluster: true, clusterRadius: 35, clusterMaxZoom: 16,
      });
      map.addLayer({
        id: 'avaluo-clusters', type: 'circle', source: 'avaluos-medellin',
        filter: ['has', 'point_count'],
        paint: {
          'circle-radius': ['step', ['get', 'point_count'], 20, 20, 25, 100, 31],
          'circle-color': '#102d38', 'circle-opacity': 0.95,
          'circle-stroke-color': '#58ead6', 'circle-stroke-width': 2.5,
        },
      });
      map.addLayer({
        id: 'avaluo-cluster-count', type: 'symbol', source: 'avaluos-medellin',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['to-string', ['get', 'point_count_abbreviated']],
          'text-font': ['Noto Sans Regular'], 'text-size': 15,
          'text-allow-overlap': true, 'text-ignore-placement': true,
        },
        paint: { 'text-color': '#ffffff' },
      });
      for (const range of valueRanges) {
        map.addImage(`pin-${range.color.slice(1)}`, locationPin(range.color), {
          pixelRatio: 2,
        });
      }
      map.addLayer({
        id: 'avaluo-points',
        type: 'symbol',
        source: 'avaluos-medellin',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.46, 16, 0.74, 19, 0.92],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-pitch-alignment': 'viewport',
          'icon-rotation-alignment': 'viewport',
        },
      });

      for (const landmark of landmarks) {
        map.addImage(
          `landmark-${landmark.id}`,
          landmarkPin(landmark.color, landmark.icon),
          { pixelRatio: 2 },
        );
      }
      map.addSource('medellin-landmarks', {
        type: 'geojson',
        data: landmarkGeojson,
      });
      map.addLayer({
        id: 'landmark-points',
        type: 'symbol',
        source: 'medellin-landmarks',
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.48, 15, 0.72, 18, 0.9],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
          'text-offset': [0, 3.1],
          'text-anchor': 'top',
          'text-optional': true,
        },
        paint: {
          'text-color': '#183c35',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
          'text-halo-blur': 0.5,
        },
      });

      const selectFeature = (event: MapLayerMouseEvent) => {
        const properties = event.features?.[0]?.properties;
        const key = properties?.key as string | undefined;
        const id = properties?.id as string | undefined;
        if (!key || !id) return;
        const group = groups.find((item) => item.key === key);
        if (!group) return;
        setRecordIndex(
          Math.max(
            0,
            group.records.findIndex((item) => item.id === id),
          ),
        );
        setViewMode('menu');
        setSelectedKey(key);
        setActiveLandmarkId(null);
        setReturnToTourAfterQuiz(false);
        setTouring(false);
        map.flyTo({
          center: [group.lng, group.lat],
          zoom: Math.max(map.getZoom(), 17.2),
          pitch: 66,
          bearing: -18,
          duration: 1100,
        });
      };
      map.on('click', 'avaluo-points', selectFeature);
      map.on('click', 'landmark-points', (event) => {
        const id = event.features?.[0]?.properties?.id as string | undefined;
        const landmark = landmarks.find((item) => item.id === id);
        if (!landmark) return;
        setTouring(false);
        setTourLandmarkId(null);
        setSelectedKey(null);
        setActiveLandmarkId(landmark.id);
        map.flyTo({
          center: landmark.coordinates,
          zoom: landmark.zoom,
          pitch: landmark.pitch,
          bearing: landmark.bearing,
          duration: 1400,
        });
      });
      map.on('click', 'avaluo-clusters', async (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;
        setTouring(false);
        const source = map.getSource('avaluos-medellin') as maplibregl.GeoJSONSource;
        const center = feature.geometry.coordinates.slice(0, 2) as [number, number];
        try {
          const zoom = await source.getClusterExpansionZoom(Number(feature.properties?.cluster_id));
          if (mapRef.current !== map) return;
          map.flyTo({ center, zoom: Math.min(zoom + 0.4, 19), duration: 900 });
        } catch {
          if (mapRef.current === map) map.flyTo({ center, zoom: Math.min(map.getZoom() + 2, 19), duration: 900 });
        }
      });
      for (const layer of ['avaluo-points', 'avaluo-clusters', 'landmark-points']) {
        map.on('mouseenter', layer, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layer, () => {
          map.getCanvas().style.cursor = '';
        });
      }
    });

    return () => {
      window.clearTimeout(readyFallback);
      map.remove();
      mapRef.current = null;
    };
  }, [geojson, groups]);

  useEffect(() => {
    if (!touring || !mapRef.current) {
      setTourLandmarkId(null);
      setTourAppraisalId(null);
      return;
    }
    const timers: number[] = [];
    const visit = () => {
      const position = tourPositionRef.current;
      const isAppraisalStop = position.stopIndex % 2 === 0;

      if (isAppraisalStop) {
        const stop = appraisals[position.appraisalIndex % appraisals.length];
        setTourLandmarkId(null);
        setTourAppraisalId(stop.id);
        mapRef.current?.flyTo({
          center: [stop.lng, stop.lat],
          zoom: 17.2,
          pitch: 66,
          bearing: position.appraisalIndex % 2 === 0 ? -18 : 24,
          duration: 2300,
        });
        position.appraisalIndex =
          (position.appraisalIndex + 1) % appraisals.length;
      } else {
        const stop = landmarks[position.landmarkIndex % landmarks.length];
        setTourAppraisalId(null);
        setTourLandmarkId(stop.id);
        mapRef.current?.flyTo({
          center: stop.coordinates,
          zoom: stop.zoom,
          pitch: stop.pitch,
          bearing: stop.bearing,
          duration: 2300,
        });
        position.landmarkIndex =
          (position.landmarkIndex + 1) % landmarks.length;
      }

      timers.push(
        window.setTimeout(() => {
          setTourLandmarkId(null);
          setTourAppraisalId(null);
        }, 6100),
        window.setTimeout(() => {
          tourPositionRef.current.stopIndex += 1;
          visit();
        }, 7300),
      );
    };
    visit();
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [touring]);

  const toggleTour = () => {
    if (touring) tourPositionRef.current.stopIndex += 1;
    setSelectedKey(null);
    setActiveLandmarkId(null);
    setLandmarkDirectoryOpen(false);
    setAppraisalDirectoryOpen(false);
    setReturnToTourAfterQuiz(false);
    setViewMode('menu');
    setTouring((value) => !value);
  };

  const resetView = () => {
    tourPositionRef.current = {
      stopIndex: 0,
      appraisalIndex: 0,
      landmarkIndex: 0,
    };
    setTouring(false);
    setTourLandmarkId(null);
    setTourAppraisalId(null);
    setSelectedKey(null);
    setActiveLandmarkId(null);
    setLandmarkDirectoryOpen(false);
    setAppraisalDirectoryOpen(false);
    setReturnToTourAfterQuiz(false);
    setViewMode('menu');
    mapRef.current?.flyTo({ ...cityView, duration: 1200 });
  };

  const exploreLandmark = (landmark: Landmark) => {
    setLandmarkDirectoryOpen(false);
    setTouring(false);
    setTourLandmarkId(null);
    setTourAppraisalId(null);
    setSelectedKey(null);
    setReturnToTourAfterQuiz(false);
    setViewMode('menu');
    setActiveLandmarkId(landmark.id);
    mapRef.current?.flyTo({
      center: landmark.coordinates,
      zoom: landmark.zoom,
      pitch: landmark.pitch,
      bearing: landmark.bearing,
      duration: 1400,
    });
  };

  const exploreAppraisal = (appraisal: Appraisal) => {
    const group = groups.find((item) =>
      item.records.some((record) => record.id === appraisal.id),
    );
    if (!group) return;
    setAppraisalDirectoryOpen(false);
    setLandmarkDirectoryOpen(false);
    setTouring(false);
    setTourLandmarkId(null);
    setTourAppraisalId(null);
    setActiveLandmarkId(null);
    setReturnToTourAfterQuiz(false);
    setSelectedKey(group.key);
    setRecordIndex(
      Math.max(0, group.records.findIndex((record) => record.id === appraisal.id)),
    );
    setViewMode('menu');
    mapRef.current?.flyTo({
      center: [group.lng, group.lat],
      zoom: 17.2,
      pitch: 66,
      bearing: -18,
      duration: 1200,
    });
  };

  const resumeTourAfterQuiz = () => {
    setSelectedKey(null);
    setActiveLandmarkId(null);
    setViewMode('menu');
    setReturnToTourAfterQuiz(false);
    setTouring(true);
  };

  return (
    <main className="relative h-dvh min-h-[540px] overflow-hidden bg-[#e9efed] text-[#102723]">
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ position: 'absolute', inset: 0 }}
        aria-label="Mapa tridimensional interactivo de avalúos en Medellín"
      />

      {introOpen && (
        <IntroScreen
          ready={ready}
          appraisalCount={appraisals.length}
          locationCount={groups.length}
          onEnter={() => setIntroOpen(false)}
        />
      )}

      <header className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-start justify-between gap-4 p-4 md:p-7">
        <div className="pointer-events-auto max-w-[min(88vw,460px)] rounded-2xl border border-white/80 bg-white/92 p-4 shadow-[0_18px_48px_rgba(24,52,47,.16)] backdrop-blur-xl md:p-5">
          <div className="mb-3 flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#168a77]">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#d8f5ef] ring-1 ring-[#168a77]/15">
              <Building2 className="size-4" />
            </span>
            Appraiser · Medellín
          </div>
          <h1 className="text-2xl font-medium tracking-[-0.035em] md:text-3xl">
            Avalúos que cuentan la ciudad
          </h1>
          <p className="mt-1 text-sm text-[#526762] md:text-base">
            Toca un pin para elegir entre el reto o la ficha del avalúo.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span>
              <strong className="text-lg font-medium">
                {appraisals.length.toLocaleString('es-CO')}
              </strong>{' '}
              avalúos
            </span>
            <span>
              <strong className="text-lg font-medium">{groups.length.toLocaleString('es-CO')}</strong>{' '}
              ubicaciones
            </span>
            <span className="flex items-center gap-1.5 text-[#526762]">
              <BadgeDollarSign className="size-4" /> color = valor
            </span>
            <span className="flex items-center gap-1.5 text-[#526762]">
              <Compass className="size-4" /> {landmarks.length} hitos
            </span>
          </div>
        </div>
      </header>

      <div className="absolute bottom-5 left-4 z-10 flex flex-wrap gap-2 md:bottom-7 md:left-7">
        <Button
          size="lg"
          className="h-12 rounded-xl border border-[#0b5748]/15 bg-[#123e36] px-4 text-white shadow-[0_10px_28px_rgba(24,52,47,.2)] hover:bg-[#0b5748]"
          onClick={toggleTour}
        >
          {touring ? <Pause className="size-5" /> : <Play className="size-5" />}
          {touring ? 'Pausar recorrido' : 'Recorrido 3D'}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12 rounded-xl border-white/90 bg-white/92 px-4 text-[#183c35] shadow-lg backdrop-blur-md hover:bg-[#eef8f5] hover:text-[#102723]"
          onClick={resetView}
        >
          <LocateFixed className="size-5" /> Vista general
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12 rounded-xl border-white/90 bg-white/92 px-4 text-[#183c35] shadow-lg backdrop-blur-md hover:bg-[#eef8f5] hover:text-[#102723]"
          onClick={() => {
            setTouring(false);
            setTourLandmarkId(null);
            setTourAppraisalId(null);
            setSelectedKey(null);
            setActiveLandmarkId(null);
            setLandmarkDirectoryOpen(false);
            setAppraisalDirectoryOpen(true);
          }}
        >
          <ClipboardList className="size-5" /> Explorar {appraisals.length} avalúos
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12 rounded-xl border-white/90 bg-white/92 px-4 text-[#183c35] shadow-lg backdrop-blur-md hover:bg-[#eef8f5] hover:text-[#102723]"
          onClick={() => {
            setTouring(false);
            setTourLandmarkId(null);
            setTourAppraisalId(null);
            setSelectedKey(null);
            setActiveLandmarkId(null);
            setAppraisalDirectoryOpen(false);
            setLandmarkDirectoryOpen(true);
          }}
        >
          <Compass className="size-5" /> Explorar {landmarks.length} hitos
        </Button>
      </div>

      <aside className="absolute bottom-24 right-4 z-10 w-[min(330px,calc(100vw-2rem))] rounded-2xl border border-white/80 bg-white/94 text-xs text-[#183c35] shadow-[0_14px_38px_rgba(24,52,47,.18)] backdrop-blur-md md:bottom-7 md:right-20">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 font-semibold uppercase tracking-[0.12em] text-[#168a77]"
          onClick={() => setLegendOpen((current) => !current)}
          aria-expanded={legendOpen}
        >
          <span className="flex items-center gap-1.5"><Sparkles className="size-3.5" /> Leyenda del mapa</span>
          {legendOpen ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
        {legendOpen && (
          <div className="max-h-[58vh] overflow-y-auto border-t border-[#dce9e5] px-3 pb-3 pt-2">
            <p className="font-semibold text-[#294c44]">Avalúos · color por valor</p>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1.5 text-[#526762]">
              {valueRanges.map((range) => (
                <span key={range.label} className="flex items-center gap-1.5">
                  <MapPin className="size-4 fill-current" style={{ color: range.color }} />
                  {range.label}
                </span>
              ))}
            </div>
            <div className="my-2.5 h-px bg-[#dce9e5]" />
            <p className="font-semibold text-[#294c44]">Puntos de interés · símbolo por tipo</p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[#526762]">
              {pointOfInterestLegend.map(({ key, label, color, Icon }) => (
                <span key={key} className="flex items-center gap-2">
                  <span className="relative grid size-6 shrink-0 place-items-center">
                    <MapPin className="absolute size-6 fill-current" style={{ color }} />
                    <Icon className="relative -translate-y-0.5 size-2.5 text-white" strokeWidth={2.8} />
                  </span>
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </aside>

      {touring && tourLandmark && (
        <aside
          key={tourLandmark.id}
          className="landmark-tour-card absolute bottom-24 left-4 right-4 z-20 overflow-hidden rounded-[26px] border border-white/75 bg-white/95 shadow-[0_28px_80px_rgba(15,45,39,.3)] backdrop-blur-xl md:bottom-auto md:left-auto md:right-7 md:top-1/2 md:w-[390px] md:-translate-y-1/2"
        >
          <div className="h-1.5" style={{ background: tourLandmark.color }} />
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span
                className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl text-white shadow-lg"
                style={{ background: tourLandmark.color }}
              >
                {tourLandmark.glyph}
              </span>
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#168a77]">
                  Parada del recorrido
                </p>
                <h2 className="mt-1 text-2xl font-medium tracking-[-0.035em]">
                  {tourLandmark.shortName}
                </h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[#526762]">
              {tourLandmark.fact}
            </p>
            <div className="mt-4 rounded-2xl bg-[#edf7f4] p-4 text-sm leading-relaxed text-[#285047]">
              <strong className="font-semibold">Clave valuatoria:</strong>{' '}
              {tourLandmark.valuationLens}
            </div>
            <Button
              className="mt-4 w-full rounded-xl bg-[#123e36] text-white hover:bg-[#0b5748]"
              onClick={() => {
                setTouring(false);
                setActiveLandmarkId(tourLandmark.id);
              }}
            >
              <Trophy className="size-4" /> Abrir mini reto
            </Button>
          </div>
        </aside>
      )}

      {touring && tourAppraisal && (
        <aside
          key={tourAppraisal.id}
          className="landmark-tour-card absolute bottom-24 left-4 right-4 z-20 overflow-hidden rounded-[26px] border border-white/75 bg-white/95 shadow-[0_28px_80px_rgba(15,45,39,.3)] backdrop-blur-xl md:bottom-auto md:left-auto md:right-7 md:top-1/2 md:w-[390px] md:-translate-y-1/2"
        >
          <div className="h-1.5" style={{ background: colorForValue(tourAppraisal.valor) }} />
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span
                className="grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg"
                style={{ background: colorForValue(tourAppraisal.valor) }}
              >
                <Building2 className="size-6" />
              </span>
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#168a77]">
                  Parada de avalúo
                </p>
                <h2 className="mt-1 text-2xl font-medium tracking-[-0.035em]">
                  {tourAppraisal.tipo}
                </h2>
                <p className="mt-1 text-sm text-[#61736f]">
                  {tourAppraisal.barrio} · {tourAppraisal.municipio}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[#526762]">
              {tourAppraisal.descripcion}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-[#edf7f4] p-4">
              <div>
                <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-[#66807a]">
                  Valor comercial
                </span>
                <strong className="mt-1 block text-sm font-semibold text-[#183c35]">
                  {formatMoney(tourAppraisal.valor)}
                </strong>
              </div>
              <div>
                <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-[#66807a]">
                  Valor por m²
                </span>
                <strong className="mt-1 block text-sm font-semibold text-[#183c35]">
                  {tourAppraisal.valorMetroCuadrado
                    ? formatMoney(tourAppraisal.valorMetroCuadrado)
                    : 'Sin dato'}
                </strong>
              </div>
            </div>
            <Button
              className="mt-4 w-full rounded-xl bg-[#123e36] text-white hover:bg-[#0b5748]"
              onClick={() => {
                const group = groups.find((item) =>
                  item.records.some((record) => record.id === tourAppraisal.id),
                );
                if (!group) return;
                tourPositionRef.current.stopIndex += 1;
                setTouring(false);
                setReturnToTourAfterQuiz(true);
                setRecordIndex(
                  Math.max(
                    0,
                    group.records.findIndex((record) => record.id === tourAppraisal.id),
                  ),
                );
                setSelectedKey(group.key);
                setViewMode('menu');
              }}
            >
              <BrainCircuit className="size-4" /> Explorar este avalúo
            </Button>
          </div>
        </aside>
      )}

      {!ready && !introOpen && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[#e9efed]">
          <div className="flex items-center gap-3 rounded-xl border border-white/80 bg-white px-5 py-3 text-[#183c35] shadow-xl">
            <span className="size-3 animate-pulse rounded-full bg-[#08b89d]" />{' '}
            Preparando Medellín en 3D…
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(selected && selectedGroup)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedKey(null);
            setViewMode('menu');
            setReturnToTourAfterQuiz(false);
          }
        }}
      >
        <DialogContent
          className="max-h-[92dvh] w-[min(95vw,960px)] overflow-hidden rounded-[28px] border-0 bg-white p-0 text-[#102723] shadow-[0_36px_120px_rgba(8,35,31,.36)] ring-0 sm:max-w-[960px]"
          aria-describedby="appraisal-description"
        >
          {selected && selectedGroup && (
            viewMode === 'menu' ? (
              <div className="grid max-h-[92dvh] overflow-y-auto lg:grid-cols-[0.9fr_1.1fr]">
                <section className="bg-[#eef5f3] p-5 sm:p-7">
                  <FacadePhoto
                    key={`${selected.id}:${selected.foto ?? ''}`}
                    src={selected.foto}
                    images={selected.imagenes}
                    barrio={selected.barrio}
                    className="mb-0"
                    eager
                  />
                  <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#61736f]">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: colorForValue(selected.valor) }}
                    />
                    {selected.tipo} · {selected.uso}
                  </div>
                  <p className="mt-2 text-2xl font-medium tracking-[-0.04em]">
                    {selected.municipio ? `${selected.municipio} · ` : ''}{selected.barrio}
                  </p>
                  <p className="mt-1 text-sm text-[#61736f]">
                    {formatMoney(selected.valor)}
                  </p>
                </section>

                <section className="p-6 sm:p-9">
                  <DialogHeader>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#168a77]">
                      Punto de avalúo
                    </p>
                    <DialogTitle className="pr-9 text-3xl font-medium leading-tight tracking-[-0.045em] sm:text-4xl">
                      ¿Qué quieres explorar?
                    </DialogTitle>
                    <DialogDescription id="appraisal-description" className="text-base leading-relaxed">
                      Elige un reto de conocimiento o consulta directamente la ficha anonimizada.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="mt-7 grid gap-4">
                    <button
                      type="button"
                      onClick={() => setViewMode('quiz')}
                      className="group flex items-center gap-4 rounded-2xl border border-[#b8ded4] bg-[#e9f8f3] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#24a87d] hover:shadow-lg"
                    >
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#168a77] text-white shadow-md">
                        <BrainCircuit className="size-6" />
                      </span>
                      <span>
                        <strong className="block text-lg font-semibold text-[#123e36]">Iniciar reto de trivia</strong>
                        <span className="mt-1 block text-sm text-[#526762]">Pon a prueba tu lectura del inmueble y su contexto.</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewMode('details')}
                      className="group flex items-center gap-4 rounded-2xl border border-[#dbe5e2] bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-[#6aa79a] hover:shadow-lg"
                    >
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#173c35] text-white shadow-md">
                        <ClipboardList className="size-6" />
                      </span>
                      <span>
                        <strong className="block text-lg font-semibold text-[#123e36]">Ver ficha del avalúo</strong>
                        <span className="mt-1 block text-sm text-[#526762]">Consulta áreas, régimen, fecha y valor comercial.</span>
                      </span>
                    </button>
                  </div>

                  {selectedGroup.records.length > 1 && (
                    <div className="mt-7 flex items-center justify-between rounded-2xl bg-[#f4f7f6] p-2">
                      <Button
                        variant="ghost"
                        onClick={() => setRecordIndex((recordIndex - 1 + selectedGroup.records.length) % selectedGroup.records.length)}
                      >
                        <ChevronLeft /> Anterior
                      </Button>
                      <span className="text-sm text-[#61736f]">{recordIndex + 1} de {selectedGroup.records.length}</span>
                      <Button
                        variant="ghost"
                        onClick={() => setRecordIndex((recordIndex + 1) % selectedGroup.records.length)}
                      >
                        Siguiente <ChevronRight />
                      </Button>
                    </div>
                  )}
                </section>
              </div>
            ) : viewMode === 'quiz' ? (
              <>
                <DialogHeader className="sr-only">
                  <DialogTitle>Trivia de avalúos en {selected.barrio}</DialogTitle>
                  <DialogDescription id="appraisal-description">Reto interactivo del inmueble.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[92dvh] overflow-y-auto">
                  <div className="sticky top-0 z-10 border-b border-[#dbe5e2] bg-white/95 px-5 py-3 backdrop-blur-md">
                    <Button variant="ghost" onClick={() => setViewMode('menu')}>
                      <ChevronLeft /> Volver a opciones
                    </Button>
                  </div>
                  <AppraisalTrivia
                    key={selected.id}
                    record={selected}
                    onReveal={() => setViewMode('details')}
                    onResumeTour={
                      returnToTourAfterQuiz ? resumeTourAfterQuiz : undefined
                    }
                  />
                </div>
              </>
            ) : (
              <div className="max-h-[92dvh] overflow-y-auto">
              <DialogHeader className="border-b border-[#dbe5e2] px-6 pb-5 pt-7 sm:px-8">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#168a77]">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: colorForValue(selected.valor) }}
                  />
                  Ficha del avalúo
                </div>
                <DialogTitle className="pr-8 text-3xl font-medium tracking-[-0.04em]">
                  {selected.barrio}
                </DialogTitle>
                <DialogDescription
                  id="appraisal-description"
                  className="text-base"
                >
                  {selected.tipo[0] + selected.tipo.slice(1).toLowerCase()} ·{' '}
                  {selected.uso}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-7 px-6 py-6 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <FacadePhoto key={`${selected.id}:${selected.foto ?? ''}`} src={selected.foto} images={selected.imagenes} barrio={selected.barrio} className="mb-4" />
                  <Button variant="outline" className="w-full rounded-xl" onClick={() => setViewMode('menu')}>
                    <ChevronLeft /> Volver a opciones
                  </Button>
                </div>
                <div>
                <p className="text-sm text-[#61736f]">Valor comercial</p>
                <p className="mt-1 text-[clamp(1.8rem,7vw,2.7rem)] font-medium tracking-[-0.055em] text-[#102723]">
                  {formatMoney(selected.valor)}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#b8ded4] bg-[#e9f8f3] px-4 py-3 text-[#123e36]">
                  <BadgeDollarSign className="size-5 text-[#168a77]" />
                  <span><strong>{formatMoney(selected.valorMetroCuadrado ?? 0)}</strong> por m²</span>
                </div>
                <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[#dbe5e2]">
                  {[
                    ['Municipio', selected.municipio || 'Medellín'],
                    ['Dirección', selected.direccion || 'Ubicación referencial'],
                    ['Área privada', formatArea(selected.areaPrivada)],
                    ['Área construida', formatArea(selected.areaConstruida)],
                    ['Área de terreno', formatArea(selected.areaTerreno, selected.unidad.toLowerCase() === 'ha' ? 'ha' : selected.unidad.toLowerCase() === 'm2' ? 'm²' : selected.unidad || 'm²')],
                    ['Régimen', selected.regimen === 'PH' ? 'Propiedad horizontal' : 'No propiedad horizontal'],
                    ['Fecha', formatDate(selected.fecha)],
                    ['Estrato', selected.estrato],
                    ['Estado', selected.estado],
                    ['Sector', selected.sector || 'Sin dato'],
                  ].map(([label, value]) => (
                    <div key={label} className="min-h-24 bg-[#f6f9f8] p-4">
                      <p className="text-xs uppercase tracking-[0.1em] text-[#70807c]">
                        {label}
                      </p>
                      <p className="mt-2 text-base font-medium">{value}</p>
                    </div>
                  ))}
                </div>
                {selected.descripcion && (
                  <section className="mt-6 rounded-2xl border border-[#dbe5e2] bg-[#f6f9f8] p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#168a77]">Descripción del inmueble</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#526762]">{selected.descripcion}</p>
                  </section>
                )}
                {selected.metodologia && (
                  <section className="mt-4 rounded-2xl border border-[#d7dce9] bg-[#f6f7fb] p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#4f6287]">Metodología valuatoria</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#526762]">{selected.metodologia}</p>
                  </section>
                )}
                {selected.caracteristicas && selected.caracteristicas.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selected.caracteristicas.map((item) => (
                      <span key={item} className="rounded-full border border-[#cddbd7] bg-white px-3 py-1.5 text-xs font-medium text-[#526762]">{item}</span>
                    ))}
                  </div>
                )}
                <p className="mt-5 text-xs leading-relaxed text-[#70807c]">
                  Información técnica para exhibición. Se omiten nombres de
                  clientes, identificaciones, matrículas y datos de contacto.
                </p>
                </div>
              </div>

              {selectedGroup.records.length > 1 && (
                <div className="flex items-center justify-between border-t border-[#dbe5e2] p-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-11"
                    onClick={() =>
                      {
                        setRecordIndex(
                          (recordIndex - 1 + selectedGroup.records.length) %
                            selectedGroup.records.length,
                        );
                        setViewMode('menu');
                      }
                    }
                  >
                    <ChevronLeft /> Anterior
                  </Button>
                  <span className="text-sm text-[#61736f]">
                    {recordIndex + 1} de {selectedGroup.records.length}
                  </span>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-11"
                    onClick={() =>
                      {
                        setRecordIndex(
                          (recordIndex + 1) % selectedGroup.records.length,
                        );
                        setViewMode('menu');
                      }
                    }
                  >
                    Siguiente <ChevronRight />
                  </Button>
                </div>
              )}
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={landmarkDirectoryOpen} onOpenChange={setLandmarkDirectoryOpen}>
        <DialogContent
          className="max-h-[92dvh] w-[min(96vw,1180px)] overflow-hidden rounded-[28px] border-0 bg-white p-0 text-[#102723] shadow-[0_36px_120px_rgba(8,35,31,.36)] ring-0 sm:max-w-[1180px]"
          aria-describedby="landmark-directory-description"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Hitos y puntos de interés de Medellín</DialogTitle>
            <DialogDescription id="landmark-directory-description">
              Lista de lugares representativos para ubicarlos en el mapa y abrir su desafío territorial.
            </DialogDescription>
          </DialogHeader>
          <LandmarkDirectory landmarks={landmarks} onSelect={exploreLandmark} />
        </DialogContent>
      </Dialog>

      <Dialog open={appraisalDirectoryOpen} onOpenChange={setAppraisalDirectoryOpen}>
        <DialogContent
          className="max-h-[92dvh] w-[min(96vw,1180px)] overflow-hidden rounded-[28px] border-0 bg-white p-0 text-[#102723] shadow-[0_36px_120px_rgba(8,35,31,.36)] ring-0 sm:max-w-[1180px]"
          aria-describedby="appraisal-directory-description"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Directorio de avalúos disponibles</DialogTitle>
            <DialogDescription id="appraisal-directory-description">
              Lista de inmuebles para ubicarlos en el mapa y abrir su experiencia interactiva.
            </DialogDescription>
          </DialogHeader>
          <AppraisalDirectory appraisals={appraisals} onSelect={exploreAppraisal} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(activeLandmark)}
        onOpenChange={(open) => {
          if (!open) setActiveLandmarkId(null);
        }}
      >
        <DialogContent
          className="max-h-[92dvh] w-[min(95vw,980px)] overflow-hidden rounded-[28px] border-0 bg-white p-0 text-[#102723] shadow-[0_36px_120px_rgba(8,35,31,.36)] ring-0 sm:max-w-[980px]"
          aria-describedby="landmark-description"
        >
          {activeLandmark && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{activeLandmark.name}</DialogTitle>
                <DialogDescription id="landmark-description">
                  Dato territorial y mini reto de conocimiento sobre Medellín.
                </DialogDescription>
              </DialogHeader>
              <LandmarkChallenge key={activeLandmark.id} landmark={activeLandmark} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
