"""Apply reviewed official name/market/address matches without guessing branches."""
from facesign import identity, MAP_URL

ONNURI_PLACE_URL = 'https://www.onnuri.gift/place'
HIRA_URL = 'https://www.data.go.kr/data/15051059/fileData.do'


def apply_official_verifications(records, hira, edits, hira_date, valid_date, coordinates):
    lookup = {r['id']: r for r in records}
    seen = set()
    for edit in edits:
        record = lookup.get(edit['id'])
        if record is None or edit['id'] in seen:
            raise ValueError('공식 대조 ID가 없거나 중복입니다.')
        seen.add(edit['id'])
        if edit.get('reviewedByAdmin') is not True or any(
                record.get(k) != edit.get(k) for k in ('name', 'region', 'market')):
            raise ValueError('공식 대조의 이름·지역·시장 또는 검토 상태가 다릅니다.')
        checked = valid_date(edit['checkedAt'])
        valid_date(edit['hiraDate'])
        if edit['hiraDate'] > hira_date:
            raise ValueError('대조에 사용한 심평원 자료보다 오래된 원본입니다.')
        key = identity(edit['name'], edit['address'])
        matches = [h for h in hira if h['요양기관명'] == edit['name'] and h['주소'] == edit['address']]
        if not key or len(matches) != 1 or (record.get('address') and record['address'] != edit['address']):
            raise ValueError('심평원 이름·주소가 유일하게 일치하지 않습니다.')
        if any(r['id'] != record['id'] and identity(r['name'], r.get('address')) == key for r in records):
            raise ValueError('이미 같은 주소의 약국이 존재합니다. 중복을 먼저 검토하세요.')
        if (edit['onnuriSource'] != ONNURI_PLACE_URL or edit['faceSignSource'] != MAP_URL
                or identity(edit['name'], edit['onnuriAddress']) != key
                or identity(edit['name'], edit['faceSignAddress']) != key
                or '카드결제' not in edit['onnuriPaymentTypes']):
            raise ValueError('양쪽 공식 가맹점 주소와 디지털 결제 근거가 필요합니다.')
        h = matches[0]
        lat, lng = coordinates(h.get('좌표(X)'), h.get('좌표(Y)'))
        record.update(address=h['주소'], district=h.get('시군구코드명', ''),
                      latitude=lat, longitude=lng, coordinateSource=HIRA_URL if lat is not None else '',
                      addressSource=HIRA_URL, addressSourceDate=hira_date,
                      addressMatchMethod='reviewed-official-onnuri-name-market-address-and-hira',
                      phone=h.get('전화번호', ''), phoneSource=HIRA_URL if h.get('전화번호') else '')
        if checked >= (record.get('onnuriSourceDate') or ''):
            record.update(onnuriSupported=True, onnuriSourceDate=checked,
                          onnuriSource=ONNURI_PLACE_URL,
                          onnuriVerificationSource=f"온누리플레이스 공식 가맹점 {edit['onnuriPlaceId']}: {edit['name']} · {edit['onnuriAddress']} · {edit['market']}. 지류상품권·QR결제·카드결제 표시를 확인했습니다.")
        if checked >= (record.get('faceSignVerifiedAt') or ''):
            record.update(faceSignStatus='verified', faceSignVerifiedAt=checked,
                          verificationUrl=MAP_URL,
                          verificationSource=f"Npay 공식 페이스사인 가맹점 지도: {edit['name']} · {edit['faceSignAddress']} (네이버 장소 {edit['naverPlaceId']}). 약국명·도로명주소를 심평원 자료와 대조했습니다. 현장 결제 확인은 아닙니다.")
        record['lastUpdatedAt'] = max(record['lastUpdatedAt'], checked)
    return records
