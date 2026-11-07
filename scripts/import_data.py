"""Convert public CSV files to a small search index + versioned region shards.

No network or third-party packages. Unknown/ambiguous identities stay unlinked.
"""
import argparse
import csv
import hashlib
import io
import json
import re
import unicodedata
import zipfile
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from facesign import merge_facesign
from official_verifications import apply_official_verifications

ROOT = Path(__file__).resolve().parents[1]
ONNURI_URL = 'https://www.data.go.kr/data/3060079/fileData.do'
HIRA_URL = 'https://www.data.go.kr/data/15051059/fileData.do'
REGIONS = {'서울': '서울특별시', '부산': '부산광역시', '대구': '대구광역시', '인천': '인천광역시', '광주': '광주광역시', '대전': '대전광역시', '울산': '울산광역시', '세종': '세종특별자치시', '경기': '경기도', '강원': '강원특별자치도', '충북': '충청북도', '충남': '충청남도', '전북': '전북특별자치도', '전남': '전라남도', '경북': '경상북도', '경남': '경상남도', '제주': '제주특별자치도', '전남광주': '전남·광주'}

def norm(value):
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', value or '')).casefold()

def clean(value):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', value or '')).strip()

def region_of(value):
    if value == '세종시': return '세종'
    for short, full in REGIONS.items():
        if value in (short, full): return short
    return value

def read_csv(path):
    if zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as archive:
            entries = [n for n in archive.namelist() if n.startswith('2.') and n.lower().endswith('.csv')]
            if len(entries) != 1: raise ValueError('심평원 ZIP에서 2.약국정보서비스 CSV를 하나만 찾을 수 있어야 합니다.')
            raw = archive.read(entries[0])
    else: raw = Path(path).read_bytes()
    for encoding in ('utf-8-sig', 'cp949'):
        try: text = raw.decode(encoding); break
        except UnicodeDecodeError: continue
    else: raise ValueError('CSV 인코딩은 UTF-8 또는 CP949여야 합니다.')
    reader = csv.DictReader(io.StringIO(text))
    return [{clean(k): clean(v) for k, v in row.items() if k} for row in reader]

def valid_date(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        raise ValueError('날짜는 YYYY-MM-DD 형식이어야 합니다.')
    parsed = date.fromisoformat(value)
    if parsed > date.today(): raise ValueError('확인일/자료 기준일은 미래일 수 없습니다.')
    return value

def supported(value):
    v = norm(value)
    if v in ('y', 'yes', '1', 'true', '가능', '가맹'): return True
    if v in ('n', 'no', '0', 'false', '불가', '미가맹'): return False
    return None

def coordinates(x, y):
    try:
        lng, lat = float(x), float(y)
        if 124 <= lng <= 132 and 32 <= lat <= 39: return lat, lng
    except (ValueError, TypeError): pass
    return None, None

def convert(rows, hira, source_date, hira_date=None):
    valid_date(source_date)
    if hira: valid_date(hira_date)
    needed = {'가맹점명', '소재지', '디지털형 가맹 여부'}
    if not rows or not needed.issubset(rows[0]): raise ValueError('공식 CSV 필수 열이 없습니다: ' + ', '.join(sorted(needed)))
    candidates = defaultdict(list)
    for h in hira:
        region = region_of(h.get('시도코드명', ''))
        group = '전남광주' if region in ('광주', '전남') else region
        candidates[(group, norm(h.get('요양기관명')))].append(h)
    pharmacies = [r for r in rows if '약국' in r['가맹점명'] or r.get('취급품목') == '약국']
    # Without a street address, market is part of identity; never collapse same-name branches.
    groups = defaultdict(list)
    for r in pharmacies:
        key = (norm(r['가맹점명']), norm(r['소재지']), norm(r.get('소속 시장명(또는 상점가)', '')))
        groups[key].append(r)
    name_counts = Counter((region_of(g[0]['소재지']), norm(g[0]['가맹점명'])) for g in groups.values())
    output = []
    for key, group in groups.items():
        r = group[0]
        region = region_of(r['소재지'])
        possible = candidates[(region, norm(r['가맹점명']))]
        h = possible[0] if len(possible) == 1 and name_counts[(region, norm(r['가맹점명']))] == 1 else None
        values = {supported(g['디지털형 가맹 여부']) for g in group}
        onnuri = values.pop() if len(values) == 1 else None
        lat, lng = coordinates(h.get('좌표(X)'), h.get('좌표(Y)')) if h else (None, None)
        matched_region = region_of(h['시도코드명']) if h else region
        if h and matched_region == '전남광주':
            address_region = h.get('주소', '').split(' ')[0]
            if address_region in ('광주광역시', '전라남도'): matched_region = region_of(address_region)
        record = {
            'id': hashlib.sha256('|'.join(key).encode()).hexdigest()[:16],
            'name': r['가맹점명'], 'region': matched_region,
            'district': h.get('시군구코드명', '') if h else '',
            'address': h.get('주소', '') if h else '',
            'market': r.get('소속 시장명(또는 상점가)', ''),
            'latitude': lat, 'longitude': lng,
            'coordinateSource': HIRA_URL if lat is not None else '',
            'addressSource': HIRA_URL if h else '', 'addressSourceDate': hira_date if h else None,
            'addressMatchMethod': 'unique-exact-name-and-region-both-datasets' if h else 'unmatched',
            'phone': h.get('전화번호', '') if h else '',
            'phoneSource': HIRA_URL if h and h.get('전화번호') else '',
            'onnuriSupported': onnuri, 'onnuriSourceDate': source_date, 'onnuriSource': ONNURI_URL,
            'faceSignStatus': 'unknown', 'faceSignVerifiedAt': None, 'verificationSource': '',
            'lastUpdatedAt': source_date
        }
        output.append(record)
    return sorted(output, key=lambda p: (p['region'], p['name'], p['market']))

def apply_verifications(records, edits):
    lookup = {r['id']: r for r in records}
    seen = set()
    for edit in edits:
        key = edit.get('id')
        if key not in lookup: raise ValueError(f'존재하지 않는 약국 ID: {key}')
        if key in seen: raise ValueError(f'중복 확인 기록: {key}')
        seen.add(key)
        status = edit.get('faceSignStatus', 'unknown')
        if status not in ('verified', 'unavailable', 'reported', 'unknown'): raise ValueError('잘못된 페이스사인 상태')
        checked = edit.get('faceSignVerifiedAt')
        source = clean(edit.get('verificationSource'))
        if status in ('verified', 'unavailable'):
            valid_date(checked)
            if not source or edit.get('reviewedByAdmin') is not True:
                raise ValueError('확인 상태에는 출처와 reviewedByAdmin: true가 필요합니다.')
        elif checked: valid_date(checked)
        record = lookup[key]
        record.update(faceSignStatus=status, faceSignVerifiedAt=checked, verificationSource=source)
        record['lastUpdatedAt'] = max(record['lastUpdatedAt'], checked or record['lastUpdatedAt'])
    return records

def write_data(records, out, metadata):
    out.mkdir(parents=True, exist_ok=True)
    def write_blob(prefix, value):
        data = json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()
        name = prefix + '-' + hashlib.sha256(data).hexdigest()[:12] + '.json'
        (out / name).write_bytes(data)
        return name
    by_region = defaultdict(dict)
    for r in records: by_region[r['region']][r['id']] = r
    shards = {}
    for region, entries in by_region.items():
        shards[region] = {'file': write_blob('region-' + region, entries), 'count': len(entries)}
    index = []
    for r in records:
        text = ' '.join([r['name'], r['region'], REGIONS.get(r['region'], ''), r['district'], r['address'], r['market']])
        row = [r['id'], r['name'], r['region'], text, r['onnuriSupported'], r['faceSignStatus'], r['faceSignVerifiedAt'], r['latitude'], r['longitude']]
        if r.get('onnuriSourceDate') and r['onnuriSourceDate'] != metadata['sourceDate']:
            row.append(r['onnuriSourceDate'])
        index.append(row)
    manifest = {**metadata, 'count': len(records), 'faceSignVerifiedCount': sum(r['faceSignStatus'] == 'verified' for r in records), 'addressCount': sum(bool(r['address']) for r in records), 'coordinateCount': sum(r['latitude'] is not None for r in records), 'index': write_blob('index', index), 'regions': shards}
    # Publish manifest last. Keep old content-addressed files so cached manifests remain valid.
    (out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    return manifest

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--onnuri', required=True)
    parser.add_argument('--date', required=True, help='온누리 자료 기준일 YYYY-MM-DD')
    parser.add_argument('--hira')
    parser.add_argument('--hira-date')
    parser.add_argument('--facesign', default=str(ROOT / 'data/admin/facesign-map-20261104.json'))
    parser.add_argument('--verifications', default=str(ROOT / 'data/admin/verifications.json'))
    parser.add_argument('--official-verifications', default=str(ROOT / 'data/admin/official-verifications.json'))
    parser.add_argument('--out', default=str(ROOT / 'penuri/data'))
    args = parser.parse_args()
    rows = read_csv(args.onnuri)
    hira = read_csv(args.hira) if args.hira else []
    records = convert(rows, hira, args.date, args.hira_date)
    onnuri_count = len(records)
    face_meta = {}
    if hira and args.facesign and Path(args.facesign).exists():
        snapshot = json.loads(Path(args.facesign).read_text())
        records, report = merge_facesign(records, hira, snapshot, args.hira_date, valid_date, coordinates)
        face_meta = {'faceSignSource': snapshot['sourceUrl'], 'faceSignSourceDate': snapshot['checkedAt'], 'faceSignCoverage': snapshot['coverage']}
        (ROOT / 'data/admin/facesign-match-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
        print(json.dumps({k: v for k, v in report.items() if k != 'matches'}, ensure_ascii=False))
    records = apply_verifications(records, json.loads(Path(args.verifications).read_text()))
    if Path(args.official_verifications).exists():
        records = apply_official_verifications(records, hira, json.loads(Path(args.official_verifications).read_text()), args.hira_date, valid_date, coordinates)
    meta = {'sourceDate': args.date, 'sourceUrl': ONNURI_URL, 'sourceName': '소상공인시장진흥공단 전국 온누리상품권 가맹점 현황', 'hiraDate': args.hira_date, 'hiraUrl': HIRA_URL, 'hiraName': '건강보험심사평가원 전국 병의원 및 약국 현황 (공공누리 제1유형)', 'sourceSha256': hashlib.sha256(Path(args.onnuri).read_bytes()).hexdigest(), 'importedAt': datetime.now(timezone.utc).isoformat(), 'rawRowCount': len(rows)}
    manifest = write_data(records, Path(args.out), {**meta, **face_meta, 'onnuriRecordCount': onnuri_count})
    print(json.dumps({k: manifest[k] for k in ('count', 'addressCount', 'coordinateCount', 'sourceDate')}, ensure_ascii=False))

if __name__ == '__main__': main()
