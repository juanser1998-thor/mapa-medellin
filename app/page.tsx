'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Layers3,
  LocateFixed,
  Pause,
  Play,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { appraisals, type Appraisal } from './data';
import 'maplibre-gl/dist/maplibre-gl.css';

type AppraisalGroup = {
  key: string;
  lng: number;
  lat: number;
  records: Appraisal[];
};

type WebMcpDocument = Document & {
  modelContext?: {
    registerTool: (
      tool: {
        name: string;
        title: string;
        description: string;
        inputSchema: object;
        annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
        execute: (input: unknown) => unknown;
      },
      options?: { signal?: AbortSignal },
    ) => void | Promise<void>;
  };
};

const cityView = {
  center: [-75.577, 6.245] as [number, number],
  zoom: 12.4,
  pitch: 58,
  bearing: -24,
};
const colors: Record<string, string> = {
  APARTAMENTO: '#08b89d',
  CASA: '#f49a43',
  LOCAL: '#2e8de6',
  OFICINA: '#7c5ce7',
};

function circlePolygon(lng: number, lat: number, radiusMeters: number) {
  const coordinates: [number, number][] = [];
  const latScale = radiusMeters / 111320;
  const lngScale = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= 28; i += 1) {
    const angle = (i / 28) * Math.PI * 2;
    coordinates.push([
      lng + Math.cos(angle) * lngScale,
      lat + Math.sin(angle) * latScale,
    ]);
  }
  return coordinates;
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

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [recordIndex, setRecordIndex] = useState(0);
  const [touring, setTouring] = useState(false);

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

  const geojson = useMemo<FeatureCollection<Polygon | Point>>(() => {
    const features: Array<Feature<Polygon | Point>> = [];
    for (const group of groups) {
      const average =
        group.records.reduce((sum, item) => sum + item.valor, 0) /
        group.records.length;
      const leadType = group.records[0].tipo;
      const common = {
        key: group.key,
        count: group.records.length,
        color: colors[leadType] ?? '#08b89d',
        height: Math.round(
          55 + Math.min(240, Math.log10(average / 1000000 + 1) * 72),
        ),
      };
      features.push({
        type: 'Feature',
        properties: common,
        geometry: {
          type: 'Polygon',
          coordinates: [
            circlePolygon(
              group.lng,
              group.lat,
              group.records.length > 1 ? 55 : 38,
            ),
          ],
        },
      });
      features.push({
        type: 'Feature',
        properties: common,
        geometry: { type: 'Point', coordinates: [group.lng, group.lat] },
      });
    }
    return { type: 'FeatureCollection', features };
  }, [groups]);

  const selectedGroup =
    groups.find((group) => group.key === selectedKey) ?? null;
  const selected = selectedGroup?.records[recordIndex] ?? null;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/bright',
      ...cityView,
      antialias: true,
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
      const vectorSource = Object.entries(map.getStyle().sources).find(
        ([, source]) => source.type === 'vector',
      )?.[0];
      if (vectorSource && !map.getLayer('city-buildings-3d')) {
        const firstLabel = map
          .getStyle()
          .layers.find((layer) => layer.type === 'symbol')?.id;
        try {
          map.addLayer(
            {
              id: 'city-buildings-3d',
              source: vectorSource,
              'source-layer': 'building',
              type: 'fill-extrusion',
              minzoom: 14,
              paint: {
                'fill-extrusion-color': '#d5d9d8',
                'fill-extrusion-height': [
                  'coalesce',
                  ['get', 'render_height'],
                  ['get', 'height'],
                  12,
                ],
                'fill-extrusion-base': [
                  'coalesce',
                  ['get', 'render_min_height'],
                  ['get', 'min_height'],
                  0,
                ],
                'fill-extrusion-opacity': 0.72,
                'fill-extrusion-vertical-gradient': true,
              },
            },
            firstLabel,
          );
        } catch {
          // El mapa continúa con la capa base si el proveedor cambia su esquema.
        }
      }

      map.addSource('avaluos-medellin', { type: 'geojson', data: geojson });
      map.addLayer({
        id: 'avaluo-halos',
        type: 'circle',
        source: 'avaluos-medellin',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 7, 16, 18],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.2,
          'circle-blur': 0.35,
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-width': 2,
        },
      });
      map.addLayer({
        id: 'avaluo-columns',
        type: 'fill-extrusion',
        source: 'avaluos-medellin',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.9,
          'fill-extrusion-vertical-gradient': true,
        },
      });
      map.addLayer({
        id: 'avaluo-counts',
        type: 'symbol',
        source: 'avaluos-medellin',
        filter: [
          'all',
          ['==', ['geometry-type'], 'Point'],
          ['>', ['get', 'count'], 1],
        ],
        layout: {
          'text-field': ['to-string', ['get', 'count']],
          'text-size': 14,
          'text-offset': [0, -1.55],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#0b2823',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
        },
      });

      const selectFeature = (event: MapLayerMouseEvent) => {
        const key = event.features?.[0]?.properties?.key as string | undefined;
        if (!key) return;
        const group = groups.find((item) => item.key === key);
        if (!group) return;
        setRecordIndex(0);
        setSelectedKey(key);
        setTouring(false);
        map.flyTo({
          center: [group.lng, group.lat],
          zoom: 15.6,
          pitch: 66,
          bearing: -18,
          duration: 1100,
        });
      };
      map.on('click', 'avaluo-columns', selectFeature);
      map.on('click', 'avaluo-halos', selectFeature);
      for (const layer of ['avaluo-columns', 'avaluo-halos']) {
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
    if (!touring || !mapRef.current) return;
    const stops = groups.filter(
      (group) =>
        group.records.length > 1 ||
        ['El Poblado', 'Caicedo', 'Robledo'].includes(group.records[0].barrio),
    );
    let index = 0;
    const visit = () => {
      const stop = stops[index % stops.length];
      mapRef.current?.flyTo({
        center: [stop.lng, stop.lat],
        zoom: 15.2,
        pitch: 64,
        bearing: -28 + index * 22,
        duration: 1800,
      });
      index += 1;
    };
    visit();
    const timer = window.setInterval(visit, 4800);
    return () => window.clearInterval(timer);
  }, [touring, groups]);

  useEffect(() => {
    const context = (document as WebMcpDocument).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'open_appraisal',
          title: 'Abrir avalúo',
          description:
            'Selecciona un avalúo del mapa por su identificador y abre su ficha visible.',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Identificador del avalúo' },
            },
            required: ['id'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute: (input) => {
            const id =
              typeof input === 'object' && input !== null && 'id' in input
                ? String((input as { id: unknown }).id)
                : '';
            const appraisal = appraisals.find((item) => item.id === id);
            if (!appraisal)
              throw new Error('No existe un avalúo con ese identificador.');
            const key = `${appraisal.lng.toFixed(6)},${appraisal.lat.toFixed(6)}`;
            const group = groups.find((item) => item.key === key);
            if (!group)
              throw new Error('El avalúo no tiene una ubicación disponible.');
            setTouring(false);
            setSelectedKey(key);
            setRecordIndex(group.records.findIndex((item) => item.id === id));
            mapRef.current?.flyTo({
              center: [group.lng, group.lat],
              zoom: 15.6,
              pitch: 66,
              bearing: -18,
              duration: 1100,
            });
            return {
              id: appraisal.id,
              barrio: appraisal.barrio,
              tipo: appraisal.tipo,
              valor: appraisal.valor,
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, [groups]);

  const resetView = () => {
    setTouring(false);
    setSelectedKey(null);
    mapRef.current?.flyTo({ ...cityView, duration: 1200 });
  };

  return (
    <main className="relative h-dvh min-h-[540px] overflow-hidden bg-[#e9efed] text-[#102723]">
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ position: 'absolute', inset: 0 }}
        aria-label="Mapa tridimensional interactivo de avalúos en Medellín"
      />

      <header className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-start justify-between gap-4 p-4 md:p-7">
        <div className="pointer-events-auto max-w-[min(88vw,460px)] rounded-2xl border border-white/70 bg-white/88 p-4 shadow-[0_18px_48px_rgba(24,52,47,.14)] backdrop-blur-xl md:p-5">
          <div className="mb-3 flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#168a77]">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#d8f5ef]">
              <Building2 className="size-4" />
            </span>
            Appraiser · Medellín
          </div>
          <h1 className="text-2xl font-medium tracking-[-0.035em] md:text-3xl">
            Avalúos que cuentan la ciudad
          </h1>
          <p className="mt-1 text-sm text-[#526762] md:text-base">
            Toca una columna para explorar su valor y características.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span>
              <strong className="text-lg font-medium">
                {appraisals.length}
              </strong>{' '}
              avalúos
            </span>
            <span>
              <strong className="text-lg font-medium">{groups.length}</strong>{' '}
              ubicaciones
            </span>
            <span className="flex items-center gap-1.5 text-[#526762]">
              <Layers3 className="size-4" /> altura = valor
            </span>
          </div>
        </div>
      </header>

      <div className="absolute bottom-5 left-4 z-10 flex flex-wrap gap-2 md:bottom-7 md:left-7">
        <Button
          size="lg"
          className="h-12 rounded-xl bg-[#123e36] px-4 text-white shadow-lg hover:bg-[#0b5748]"
          onClick={() => setTouring((value) => !value)}
        >
          {touring ? <Pause className="size-5" /> : <Play className="size-5" />}
          {touring ? 'Pausar recorrido' : 'Recorrido 3D'}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12 rounded-xl border-white/80 bg-white/88 px-4 shadow-lg backdrop-blur-md"
          onClick={resetView}
        >
          <LocateFixed className="size-5" /> Vista general
        </Button>
      </div>

      <div className="pointer-events-none absolute bottom-20 right-4 z-10 hidden rounded-xl border border-white/70 bg-white/88 px-3 py-2 text-xs shadow-md backdrop-blur-md sm:block md:bottom-7 md:right-20">
        <div className="mb-1.5 flex items-center gap-1.5 font-medium">
          <Sparkles className="size-3.5 text-[#168a77]" /> Tipos de inmueble
        </div>
        <div className="flex flex-wrap gap-3 text-[#526762]">
          {Object.entries(colors).map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5">
              <i
                className="size-2.5 rounded-full"
                style={{ background: color }}
              />
              {label[0] + label.slice(1).toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      {!ready && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[#e9efed]">
          <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 shadow-lg">
            <span className="size-3 animate-pulse rounded-full bg-[#08b89d]" />{' '}
            Preparando Medellín en 3D…
          </div>
        </div>
      )}

      <Sheet
        open={Boolean(selected && selectedGroup)}
        onOpenChange={(open) => {
          if (!open) setSelectedKey(null);
        }}
      >
        <SheetContent
          className="w-[min(92vw,430px)] border-l-white/60 bg-white/96 p-0 backdrop-blur-xl sm:max-w-[430px]"
          aria-describedby="appraisal-description"
        >
          {selected && selectedGroup && (
            <>
              <SheetHeader className="border-b border-[#dbe5e2] px-6 pb-5 pt-7">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#168a77]">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: colors[selected.tipo] ?? '#08b89d' }}
                  />
                  Avalúo #{selected.id}
                </div>
                <SheetTitle className="pr-8 text-3xl font-medium tracking-[-0.04em]">
                  {selected.barrio}
                </SheetTitle>
                <SheetDescription
                  id="appraisal-description"
                  className="text-base"
                >
                  {selected.tipo[0] + selected.tipo.slice(1).toLowerCase()} ·{' '}
                  {selected.uso}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                <p className="text-sm text-[#61736f]">Valor comercial</p>
                <p className="mt-1 text-[clamp(1.8rem,7vw,2.7rem)] font-medium tracking-[-0.055em] text-[#102723]">
                  {formatMoney(selected.valor)}
                </p>
                <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[#dbe5e2]">
                  {[
                    ['Área', `${selected.area.toLocaleString('es-CO')} m²`],
                    [
                      'Valor por m²',
                      selected.area
                        ? formatMoney(selected.valor / selected.area)
                        : 'Sin dato',
                    ],
                    ['Fecha', formatDate(selected.fecha)],
                    ['Estrato', selected.estrato],
                    ['Estado', selected.estado],
                    ['Sector', 'Urbano'],
                  ].map(([label, value]) => (
                    <div key={label} className="min-h-24 bg-[#f6f9f8] p-4">
                      <p className="text-xs uppercase tracking-[0.1em] text-[#70807c]">
                        {label}
                      </p>
                      <p className="mt-2 text-base font-medium">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-xs leading-relaxed text-[#70807c]">
                  Información anonimizada para exhibición. No se muestran
                  cliente, folio ni dirección exacta.
                </p>
              </div>

              {selectedGroup.records.length > 1 && (
                <div className="flex items-center justify-between border-t border-[#dbe5e2] p-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-11"
                    onClick={() =>
                      setRecordIndex(
                        (recordIndex - 1 + selectedGroup.records.length) %
                          selectedGroup.records.length,
                      )
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
                      setRecordIndex(
                        (recordIndex + 1) % selectedGroup.records.length,
                      )
                    }
                  >
                    Siguiente <ChevronRight />
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}
