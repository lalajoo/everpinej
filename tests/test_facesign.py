import sys
import unittest
from copy import deepcopy
from pathlib import Path
sys.path.insert(0, str(Path('scripts').resolve()))
from facesign import address_key, merge_facesign, MAP_URL
from import_data import convert, valid_date, coordinates

def hira(name='테스트약국', street='서울특별시 종로구 종로 202-1, 1층'):
    return {'요양기관명':name,'시도코드명':'서울','시군구코드명':'종로구','주소':street,'좌표(X)':'127.0','좌표(Y)':'37.5','전화번호':'02-000-0000'}

def snapshot(name='테스트약국', street='서울 종로구 종로 202-1'):
    return {'sourceUrl':MAP_URL,'method':'official-map-visible-search-results','checkedAt':'2026-11-04','stores':[{'name':name,'address':street}]}

def merge(records, pharmacies, data):
    return merge_facesign(records, pharmacies, data, '2026-09-30', valid_date, coordinates)

class FaceSignTests(unittest.TestCase):
    def test_address_aliases_without_guessing_house_numbers(self):
        self.assertEqual(address_key('서울특별시 종로구 종로 202-1, 1층'),address_key('서울 종로구 종로 202-1'))
        self.assertNotEqual(address_key('서울 종로구 종로 202-1'),address_key('서울 종로구 종로 202'))
        self.assertNotEqual(address_key('부산 중구 중앙대로 10'),address_key('대구 중구 중앙대로 10'))
        self.assertIsNone(address_key('서울 종로구 관수동 12'))

    def test_official_face_listing_never_implies_onnuri(self):
        records, report=merge([], [hira()], snapshot())
        self.assertEqual(report['added'],1)
        self.assertEqual(records[0]['faceSignStatus'],'verified')
        self.assertIsNone(records[0]['onnuriSupported'])
        self.assertIsNone(records[0]['onnuriSourceDate'])

    def test_existing_exact_identity_gets_verified(self):
        records=convert([{'가맹점명':'테스트약국','소재지':'서울','디지털형 가맹 여부':'Y','소속 시장명(또는 상점가)':'테스트시장'}],[hira()],'2026-07-31','2026-09-30')
        records, report=merge(records,[hira()],snapshot())
        self.assertEqual(report['matchedExisting'],1)
        self.assertEqual(len(records),1)
        self.assertTrue(records[0]['onnuriSupported'])

    def test_other_branch_nonpharmacy_and_duplicate_identity_are_rejected(self):
        for pharmacies, data in [([hira()],snapshot(street='서울 종로구 종로 202-2')),([hira(),hira()],snapshot()),([hira()],snapshot(name='카페',street='서울 종로구 종로 202-1 테스트약국 2층'))]:
            records,_=merge([],pharmacies,data)
            self.assertEqual(records,[])

    def test_unresolved_existing_name_is_not_merged(self):
        unknown={'id':'test','name':'테스트약국','region':'서울','address':''}
        records,report=merge([unknown],[hira()],snapshot())
        self.assertEqual(report['added'],0)
        self.assertEqual(records,[unknown])

    def test_untrusted_source_and_future_evidence_rejected(self):
        for patch in [{'sourceUrl':'https://example.com/'},{'checkedAt':'2099-01-01'}]:
            data=snapshot();data.update(patch)
            with self.assertRaises(ValueError):merge([], [hira()], data)

if __name__=='__main__':unittest.main()
