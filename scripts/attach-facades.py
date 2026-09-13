"""Attach local facade photos to sanitized appraisals through the exact FID/SIB mapping."""
import json
import re
import shutil
import sys
from collections import defaultdict
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
WORKSPACE = PROJECT.parent
FACADE_SOURCE = Path(r'C:\Users\Juan Sebastian\Documents\imagenes_medellin\salida\fachadas')
sys.path.insert(0, str(WORKSPACE / '.medellin-tools'))
import xlrd


def normalize_sib(value):
    return re.sub(r'[-_\s]+$', '', str(value or '').strip()).upper()


book = xlrd.open_workbook(str(WORKSPACE / 'medellin_actualizado.xls'))
sheet = book.sheet_by_index(0)
headers = sheet.row_values(0)
fid_index = headers.index('FID')
sib_index = headers.index('folio_enti')
fid_to_sib = {
    str(int(sheet.cell_value(row, fid_index))): normalize_sib(sheet.cell_value(row, sib_index))
    for row in range(1, sheet.nrows)
}

photo_groups = defaultdict(list)
source_photo_files = [
    photo
    for photo in sorted(FACADE_SOURCE.iterdir(), key=lambda path: path.name.upper())
    if photo.is_file() and photo.suffix.lower() == '.jpg'
]
for photo in source_photo_files:
    if photo.is_file() and photo.suffix.lower() == '.jpg' and photo.stat().st_size >= 10_000:
        photo_groups[normalize_sib(photo.stem)].append(photo)


def preferred_photo(code):
    candidates = photo_groups.get(code, [])
    if not candidates:
        return None
    return min(
        candidates,
        key=lambda path: (
            path.stem.upper() != code,
            len(path.stem),
            path.name.upper(),
        ),
    )


data_path = PROJECT / 'app' / 'appraisals.json'
source_records = json.loads(
    (PROJECT / 'scripts' / 'appraisals-full.json').read_text(encoding='utf-8')
)
assert len(source_records) == 3093, 'Expected the complete validated appraisal set'

facade_target = PROJECT / 'public' / 'fachadas'
facade_target.mkdir(parents=True, exist_ok=True)
published = []
selected_photos = {}
matched_codes = set()

for record in source_records:
    code = fid_to_sib.get(record['id'], '')
    photo = preferred_photo(code)
    if not photo:
        continue
    output_name = f"{record['id']}.jpg"
    updated = dict(record)
    updated['foto'] = f'/fachadas/{output_name}'
    published.append(updated)
    selected_photos[output_name] = photo
    matched_codes.add(code)

for output_name, source in selected_photos.items():
    shutil.copyfile(source, facade_target / output_name)

report = {
    'sourceRecords': len(source_records),
    'publishedRecords': len(published),
    'sourcePhotoFiles': len(source_photo_files),
    'rejectedPhotoFiles': len(source_photo_files) - sum(len(paths) for paths in photo_groups.values()),
    'uniquePhotoCodes': len(photo_groups),
    'matchedPhotoCodes': len(matched_codes),
    'duplicatePhotoCodeGroups': sum(len(paths) > 1 for paths in photo_groups.values()),
    'unmatchedSourceRecords': len(source_records) - len(published),
    'unusedPhotoCodes': len(set(photo_groups) - matched_codes),
    'publicFilenames': 'Sanitized FID.jpg; SIB codes are not exposed',
}

data_path.write_text(
    json.dumps(published, ensure_ascii=False, separators=(',', ':')),
    encoding='utf-8',
)
(PROJECT / 'scripts' / 'facade-import-report.json').write_text(
    json.dumps(report, ensure_ascii=False, indent=2),
    encoding='utf-8',
)
print(json.dumps(report, ensure_ascii=True))
