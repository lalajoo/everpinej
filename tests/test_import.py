import importlib.util
import unittest
import sys
from pathlib import Path
sys.path.insert(0, str(Path('scripts').resolve()))
spec = importlib.util.spec_from_file_location('importer', 'scripts/import_data.py')
imp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(imp)

def row(name='테스트약국', market='테스트시장', digital='Y'):
    return {'가맹점명':name,'소재지':'제주','소속 시장명(또는 상점가)':market,'디지털형 가맹 여부':digital,'취급품목':'약국'}

def address(name='테스트약국'):
    return {'요양기관명':name,'시도코드명':'제주','시군구코드명':'제주시','주소':'테스트용 주소','좌표(X)':'126.5','좌표(Y)':'33.5'}

class ImportTests(unittest.TestCase):
    def test_unique_join(self):
        records=imp.convert([row()],[address()],'2026-07-31','2026-09-30')
        self.assertEqual(records[0]['latitude'],33.5)
        self.assertEqual(records[0]['faceSignStatus'],'unknown')
    def test_ambiguous_names_never_get_coordinates(self):
        records=imp.convert([row(),row(market='다른시장')],[address()],'2026-07-31','2026-09-30')
        self.assertTrue(all(r['latitude'] is None for r in records))
        records=imp.convert([row()],[address(),address()],'2026-07-31','2026-09-30')
        self.assertIsNone(records[0]['latitude'])
    def test_duplicates_and_conflicting_support(self):
        records=imp.convert([row(),row(digital='N')],[],'2026-07-31')
        self.assertEqual(len(records),1)
        self.assertIsNone(records[0]['onnuriSupported'])
    def test_admin_evidence_required(self):
        records=imp.convert([row()],[],'2026-07-31')
        edit={'id':records[0]['id'],'faceSignStatus':'verified','faceSignVerifiedAt':'2026-11-03'}
        with self.assertRaises(ValueError):imp.apply_verifications(records,[edit])
        edit.update(verificationSource='테스트 증빙',reviewedByAdmin=True)
        self.assertEqual(imp.apply_verifications(records,[edit])[0]['faceSignStatus'],'verified')
    def test_invalid_unknown_and_future_values(self):
        self.assertIsNone(imp.supported('모름'))
        self.assertEqual(imp.coordinates('', ''),(None,None))
        self.assertEqual(imp.coordinates('0','0'),(None,None))
        with self.assertRaises(ValueError):imp.valid_date('2099-01-01')
        with self.assertRaises(ValueError):imp.convert([{'가맹점명':'테스트'}],[],'2026-07-31')
    def test_new_province_alias(self):
        self.assertEqual(imp.region_of('세종시'),'세종')

if __name__=='__main__':unittest.main()
