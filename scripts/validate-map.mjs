import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';

const records = JSON.parse(fs.readFileSync('app/appraisals.json', 'utf8'));
const landmarkSource = fs.readFileSync('app/landmarks.ts', 'utf8');
const landmarkCount = (landmarkSource.match(/^\s+id: '/gm) || []).length;
assert.equal(landmarkCount, 12);
assert.equal(records.length, 18);
assert.equal(records.filter(r => r.categoria === 'especial').length, 18);
assert.equal(new Set(records.map(r => r.id)).size, records.length);
for (const r of records) {
  assert.ok(Number.isFinite(r.lng) && Number.isFinite(r.lat));
  assert.ok(r.lng > -75.9 && r.lng < -75.3 && r.lat > 6.0 && r.lat < 6.5);
  assert.ok(Number.isFinite(r.valor) && r.valor >= 0);
  assert.ok(r.regimen === 'PH' || r.regimen === 'NPH');
  assert.ok(typeof r.direccion === 'string' && r.direccion.trim().length > 0);
  assert.ok(!('cliente' in r) && !('folio' in r) && !('nomenclatura' in r) && !('matricula' in r) && !('nit' in r));
  assert.ok(Number.isFinite(Date.parse(r.fecha)));
  assert.match(r.foto, /^\/special-appraisals\/special-\d{2}\/facade\.jpg$/);
  assert.ok(Number.isFinite(r.valorMetroCuadrado) && r.valorMetroCuadrado > 0);
  assert.ok(r.descripcion && r.metodologia);
  assert.ok(Array.isArray(r.imagenes) && r.imagenes.length >= 1);
  for (const image of r.imagenes) {
    assert.match(image, /^\/special-appraisals\/special-\d{2}\/(facade|detail-[12])\.jpg$/);
    assert.ok(fs.statSync(`public${image}`).size >= 5_000);
  }
}
assert.ok(!fs.existsSync('public/fachadas'));
assert.equal(new Set(records.map(r => r.foto)).size, records.length);
assert.deepEqual(
  records.reduce((counts, record) => {
    counts[record.regimen] = (counts[record.regimen] || 0) + 1;
    return counts;
  }, {}),
  { NPH: 10, PH: 8 },
);
const pageSource = fs.readFileSync('app/page.tsx', 'utf8');
assert.match(pageSource, /const isAppraisalStop = position\.stopIndex % 2 === 0/);
assert.match(pageSource, /resumeTourAfterQuiz/);
assert.match(pageSource, /tourPositionRef\.current\.stopIndex \+= 1/);
assert.match(pageSource, /onResumeTour=\{resumeTourAfterQuiz\}/);
assert.match(pageSource, /const TOUR_CARD_VISIBLE_MS = 21_100/);
assert.match(pageSource, /const TOUR_STOP_INTERVAL_MS = 22_300/);
assert.match(pageSource, /Parada de avalúo/);
assert.match(pageSource, /Parada del recorrido/);
const source = ts.createSourceFile('page.tsx', pageSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const layers = [];
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'map.addLayer' && ts.isObjectLiteralExpression(node.arguments[0])) {
    layers.push(vm.runInNewContext(`(${node.arguments[0].getText(source)})`, { vectorSource: 'buildings' }));
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(layers.some(l => l.id === 'avaluo-points'));
assert.ok(layers.some(l => l.id === 'avaluo-clusters'));
assert.ok(layers.some(l => l.id === 'landmark-points'));
const style = {
  version: 8, glyphs: 'https://example.com/{fontstack}/{range}.pbf',
  sources: {
    buildings: { type: 'vector', tiles: ['https://example.com/{z}/{x}/{y}.pbf'] },
    'avaluos-medellin': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    'medellin-landmarks': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
  }, layers,
};
const errors = validateStyleMin(style);
assert.deepEqual(errors.map(e => e.message), [], 'MapLibre must accept every layer');
const bands = [0, 0, 0, 0];
records.forEach(r => bands[r.valor < 4e9 ? 0 : r.valor < 10e9 ? 1 : r.valor < 25e9 ? 2 : 3]++);
assert.deepEqual(bands, [3, 7, 5, 3]);
console.log(JSON.stringify({ records: records.length, landmarks: landmarkCount, legacyPhotos: 0, valueBands: bands, validLayers: layers.map(l => l.id) }));
