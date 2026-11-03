"""Refresh observed pharmacies without redating or removing unobserved records."""
import argparse
import json
from collections import Counter
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path

from facesign import merge_facesign
from import_data import coordinates, read_csv, valid_date, write_data


def refresh(records, manifest, hira, snapshot):
    checked = valid_date(snapshot.get('checkedAt'))
    if checked < manifest.get('faceSignSourceDate', ''):
        raise ValueError('이전 확인일보다 오래된 자료는 반영할 수 없습니다.')
    previous = Counter(r['region'] for r in records
                       if r.get('faceSignVerifiedAt') == manifest.get('faceSignSourceDate')
                       and r.get('faceSignStatus') == 'verified')
    merged, report = merge_facesign(deepcopy(records), hira, snapshot,
                                   manifest['hiraDate'], valid_date, coordinates)
    ids = {r['id'] for r in report['matches']}
    counts = Counter(r['region'] for r in merged if r['id'] in ids)
    baseline = manifest.get('faceSignRefreshedCount', manifest.get('faceSignVerifiedCount', 0))
    if not ids or len(ids) < baseline * .8:
        raise ValueError('공식 지도 대조 결과가 없거나 20% 이상 줄었습니다. 수집 범위를 재확인하세요.')
    for region, count in previous.items():
        if counts[region] < count * .8:
            raise ValueError(f'{region} 확인 결과가 20% 이상 줄었습니다. 해당 지역을 재확인하세요.')
    metadata = {k: v for k, v in manifest.items() if k not in
                ('count', 'faceSignVerifiedCount', 'addressCount', 'coordinateCount', 'index', 'regions')}
    metadata.update(faceSignSource=snapshot['sourceUrl'], faceSignSourceDate=checked,
                    faceSignCoverage=snapshot['coverage'], faceSignRefreshedCount=len(ids),
                    importedAt=datetime.now(timezone.utc).isoformat())
    report['retainedWithoutReverification'] = sum(
        r.get('faceSignStatus') == 'verified' and r['id'] not in ids for r in merged)
    return merged, metadata, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', default='penuri/data')
    parser.add_argument('--hira', required=True)
    parser.add_argument('--facesign', required=True)
    parser.add_argument('--out', required=True, help='검증 전 임시 출력 디렉터리')
    args = parser.parse_args()
    source, out = Path(args.data), Path(args.out)
    if source.resolve() == out.resolve() or out.exists():
        raise ValueError('출력은 원본과 다른 새 임시 디렉터리를 지정하세요.')
    manifest = json.loads((source / 'manifest.json').read_text())
    records = []
    for shard in manifest['regions'].values():
        records.extend(json.loads((source / shard['file']).read_text()).values())
    records, metadata, report = refresh(records, manifest, read_csv(args.hira),
                                      json.loads(Path(args.facesign).read_text()))
    out.mkdir(parents=True)
    write_data(records, out, metadata)
    (out / 'facesign-match-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps({k: v for k, v in report.items() if k != 'matches'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
