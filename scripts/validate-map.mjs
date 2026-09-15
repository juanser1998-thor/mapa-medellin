import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';

const records = JSON.parse(fs.readFileSync('app/appraisals.json', 'utf8'));
const triviaSource = fs.readFileSync('app/trivia.tsx', 'utf8');
assert.equal(records.length, 1374);
assert.equal(new Set(records.map(r => r.id)).size, records.length);
for (const r of records) {
  assert.ok(Number.isFinite(r.lng) && Number.isFinite(r.lat));
  assert.ok(r.lng > -75.85 && r.lng < -75.4 && r.lat > 6.05 && r.lat < 6.5);
  assert.ok(Number.isFinite(r.valor) && r.valor >= 0);
  assert.ok(r.regimen === 'PH' || r.regimen === 'NPH');
  assert.ok(!('cliente' in r) && !('folio' in r) && !('nomenclatu' in r));
  assert.ok(Number.isFinite(Date.parse(r.fecha)));
  assert.match(r.foto, /^\/fachadas\/\d+\.jpg$/);
  assert.ok(fs.statSync(`public${r.foto}`).size >= 10_000);
}
const facadeFiles = fs.readdirSync('public/fachadas').filter(name => name.endsWith('.jpg'));
assert.equal(facadeFiles.length, records.length);
assert.equal(new Set(records.map(r => r.foto)).size, records.length);
assert.deepEqual(
  records.reduce((counts, record) => {
    counts[record.regimen] = (counts[record.regimen] || 0) + 1;
    return counts;
  }, {}),
  { PH: 1292, NPH: 82 },
);
assert.match(
  triviaSource,
  /candidate\.regimen === record\.regimen/,
  'Every comparison must pair properties with the same PH/NPH regime',
);
for (const removedAreaQuestion of [
  'Estima el espacio',
  '¿Cuál tiene mayor área registrada?',
  'En propiedad horizontal, ¿qué área considera el avalúo?',
]) {
  assert.ok(
    !triviaSource.includes(removedAreaQuestion),
    `Area question must remain removed: ${removedAreaQuestion}`,
  );
}
const source = ts.createSourceFile('page.tsx', fs.readFileSync('app/page.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
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
const style = {
  version: 8, glyphs: 'https://example.com/{fontstack}/{range}.pbf',
  sources: {
    buildings: { type: 'vector', tiles: ['https://example.com/{z}/{x}/{y}.pbf'] },
    'avaluos-medellin': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
  }, layers,
};
const errors = validateStyleMin(style);
assert.deepEqual(errors.map(e => e.message), [], 'MapLibre must accept every layer');
const bands = [0, 0, 0, 0];
records.forEach(r => bands[r.valor < 250e6 ? 0 : r.valor < 400e6 ? 1 : r.valor < 800e6 ? 2 : 3]++);
assert.deepEqual(bands, [411, 411, 406, 146]);
console.log(JSON.stringify({ records: records.length, facadePhotos: facadeFiles.length, valueBands: bands, validLayers: layers.map(l => l.id) }));
