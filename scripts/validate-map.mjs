import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';

const records = JSON.parse(fs.readFileSync('app/appraisals.json', 'utf8'));
assert.equal(records.length, 3093);
assert.equal(new Set(records.map(r => r.id)).size, records.length);
for (const r of records) {
  assert.ok(Number.isFinite(r.lng) && Number.isFinite(r.lat));
  assert.ok(r.lng > -75.85 && r.lng < -75.4 && r.lat > 6.05 && r.lat < 6.5);
  assert.ok(Number.isFinite(r.valor) && r.valor >= 0);
  assert.ok(!('cliente' in r) && !('folio' in r) && !('nomenclatu' in r));
  assert.ok(Number.isFinite(Date.parse(r.fecha)));
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
assert.deepEqual(bands, [951, 874, 917, 351]);
console.log(JSON.stringify({ records: records.length, valueBands: bands, validLayers: layers.map(l => l.id) }));
