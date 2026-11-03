"""Download only files exposed by data.go.kr's public download buttons.

Stops when the portal requests CAPTCHA/login. No authentication bypass.
"""
import argparse
import hashlib
import http.cookiejar
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

BASE = 'https://www.data.go.kr'

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', choices=['3060079', '15051059'], default='3060079')
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    page = BASE + '/data/' + args.dataset + '/fileData.do'
    def fetch(url, params=None):
        req = urllib.request.Request(url, data=urllib.parse.urlencode(params).encode() if params else None, headers={'User-Agent': 'Penuri public-data importer/1.0', 'Referer': page})
        return opener.open(req, timeout=60).read()
    html = fetch(page).decode('utf-8')
    match = re.search(r"fn_fileDataDown\('" + args.dataset + r"',\s*'([^']+)',\s*'([^']*)',\s*'([^']+)'", html)
    if not match: raise SystemExit('공식 다운로드 버튼을 찾지 못했습니다. 포털에서 직접 CSV를 받아 import_data.py를 실행하세요.')
    detail, file_id, serial = match.groups()
    info = json.loads(fetch(BASE + '/tcs/dss/selectFileDataDownload.do', dict(publicDataPk=args.dataset, publicDataDetailPk=detail, atchFileId=file_id, fileDetailSn=serial, publicDataTyCode='PR0051')))
    if info.get('status') is not True: raise SystemExit('다운로드가 허용되지 않았습니다. 포털에서 직접 내려받아 주세요.')
    params = {k: info[k] for k in ('atchFileId', 'fileDetailSn')}
    limit = json.loads(fetch(BASE + '/cmm/cmm/check-limit.json', params))
    if limit.get('needCaptcha') is not False: raise SystemExit('포털에서 인증을 요청했습니다. 직접 다운로드한 파일을 사용하세요.')
    content = fetch(BASE + '/cmm/cmm/fileDownload.do?' + urllib.parse.urlencode(params))
    if b'<html' in content[:500].lower() or len(content) < 100: raise SystemExit('파일 응답이 아닙니다. 수동 다운로드가 필요합니다.')
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(content)
    metadata = {'sourceUrl': page, 'name': info['dataSetFileDetailInfo']['dataNm'], 'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()}
    output.with_suffix(output.suffix + '.metadata.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2))
    print(json.dumps(metadata, ensure_ascii=False))

if __name__ == '__main__': main()
