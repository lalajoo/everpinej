"""Match observed official Npay listings to pharmacy identities; never infer Onnuri support."""
import hashlib
import re
import unicodedata
from collections import defaultdict

MAP_URL = 'https://campaign2.naver.com/npay/facesignmap/'
HIRA_URL = 'https://www.data.go.kr/data/15051059/fileData.do'
ALIASES = {
    '서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구', '인천광역시': '인천',
    '광주광역시': '전남광주', '광주': '전남광주', '전라남도': '전남광주', '전남': '전남광주',
    '전남광주통합특별시': '전남광주', '대전광역시': '대전', '울산광역시': '울산',
    '세종특별자치시': '세종', '세종시': '세종', '경기도': '경기',
    '강원특별자치도': '강원', '강원도': '강원', '충청북도': '충북', '충청남도': '충남',
    '전북특별자치도': '전북', '전라북도': '전북', '경상북도': '경북', '경상남도': '경남',
    '제주특별자치도': '제주', '제주도': '제주',
}

def normalize(value):
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', value or '')).casefold()

def address_key(value):
    text = unicodedata.normalize('NFKC', value or '').replace(',', ' ')
    match = re.search(r'(\S+(?:로|길))\s+(\d+(?:-\d+)?)(?!\d)', text)
    if not match:
        return None  # Do not guess between lot-number and road-name addresses.
    prefix = text[:match.start()].split()
    if not prefix:
        return None
    prefix[0] = ALIASES.get(prefix[0], prefix[0])
    return tuple(prefix) + match.groups()

def identity(name, address):
    address = address_key(address)
    return (normalize(name), address) if address else None

def merge_facesign(records, hira, snapshot, hira_date, valid_date, coordinates):
    if snapshot.get('sourceUrl') != MAP_URL or snapshot.get('method') != 'official-map-visible-search-results':
        raise ValueError('페이스사인 자료는 확인한 공식 지도 검색 결과여야 합니다.')
    checked = valid_date(snapshot.get('checkedAt'))
    valid_date(hira_date)
    observed, official, existing = defaultdict(dict), defaultdict(list), defaultdict(list)
    for store in snapshot['stores']:
        if '약국' not in store.get('name', ''):
            continue  # An address containing 약국 can belong to a restaurant or clinic.
        key = identity(store['name'], store['address'])
        if key:
            observed[key][(store['name'], store['address'])] = store
    for h in hira:
        key = identity(h['요양기관명'], h['주소'])
        if key:
            official[key].append(h)
    uncertain_names = set()
    for r in records:
        key = identity(r['name'], r['address'])
        if key:
            existing[key].append(r)
        else:
            uncertain_names.add((normalize(r['name']), ALIASES.get(r['region'], r['region'])))
    report = {'matchedExisting': 0, 'added': 0, 'skipped': 0, 'matches': []}
    for key, stores in observed.items():
        candidates = official[key]
        if len(stores) != 1 or len(candidates) != 1 or len(existing[key]) > 1:
            report['skipped'] += 1
            continue
        h = candidates[0]
        store = next(iter(stores.values()))
        region = ALIASES.get(h['시도코드명'], h['시도코드명'])
        if existing[key]:
            record = existing[key][0]
            report['matchedExisting'] += 1
        else:
            if (normalize(h['요양기관명']), region) in uncertain_names:
                report['skipped'] += 1
                continue  # An unresolved existing same-name store must not be silently merged.
            lat, lng = coordinates(h.get('좌표(X)'), h.get('좌표(Y)'))
            record = {
                'id': hashlib.sha256(('facesign|' + repr(key)).encode()).hexdigest()[:16],
                'name': h['요양기관명'], 'region': region, 'district': h.get('시군구코드명', ''),
                'address': h['주소'], 'market': '', 'latitude': lat, 'longitude': lng,
                'coordinateSource': HIRA_URL if lat is not None else '',
                'addressSource': HIRA_URL, 'addressSourceDate': hira_date,
                'addressMatchMethod': 'unique-exact-name-and-street-address-official-map-hira',
                'phone': h.get('전화번호', ''), 'phoneSource': HIRA_URL if h.get('전화번호') else '',
                'onnuriSupported': None, 'onnuriSourceDate': None, 'onnuriSource': '',
                'lastUpdatedAt': checked,
            }
            records.append(record)
            report['added'] += 1
        record.update({
            'faceSignStatus': 'verified', 'faceSignVerifiedAt': checked,
            'verificationSource': f"Npay 공식 페이스사인 가맹점 지도에 등록된 {store['name']} · {store['address']}. 약국명·도로명주소를 심평원 자료와 대조. 현장 결제 확인은 아니며 방문 전 매장 확인이 필요합니다.",
            'verificationUrl': MAP_URL,
            'lastUpdatedAt': max(record['lastUpdatedAt'], checked),
        })
        report['matches'].append({'id': record['id'], 'name': record['name'], 'address': record['address'], 'officialMapName': store['name'], 'officialMapAddress': store['address']})
    return records, report
