import json
import sys
import unittest
from copy import deepcopy
from pathlib import Path
sys.path.insert(0, str(Path('scripts').resolve()))
from import_data import valid_date, coordinates
from official_verifications import apply_official_verifications

class OfficialVerificationTests(unittest.TestCase):
    def setUp(self):
        self.edit = json.loads(Path('data/admin/official-verifications.json').read_text())[0]
        self.record = {k:self.edit[k] for k in ('id','name','region','market')}
        self.record.update(address='',lastUpdatedAt='2026-07-31',onnuriSourceDate='2026-07-31',faceSignVerifiedAt=None)
        self.hira = {'요양기관명':self.edit['name'],'주소':self.edit['address'],'시군구코드명':'수원팔달구','좌표(X)':'127.0045568','좌표(Y)':'37.2689547'}
    def apply(self, records=None, hira=None, edit=None):
        return apply_official_verifications(records or [self.record], hira or [self.hira], [edit or self.edit], '2026-09-30', valid_date, coordinates)
    def test_review_resolves_original_id_and_both_benefits(self):
        result=self.apply()
        self.assertEqual(len(result),1)
        self.assertEqual(result[0]['id'],'8014b8e4da410fdc')
        self.assertTrue(result[0]['onnuriSupported'])
        self.assertEqual(result[0]['faceSignStatus'],'verified')
        self.assertEqual(result[0]['address'],self.hira['주소'])
    def test_wrong_market_address_and_missing_digital_evidence_rejected(self):
        for key,value in [('market','다른 시장'),('onnuriAddress','경기도 수원시 팔달구 갓매산로 52'),('onnuriPaymentTypes',['지류상품권'])]:
            edit=deepcopy(self.edit);edit[key]=value
            with self.assertRaises(ValueError): self.apply(edit=edit)
        with self.assertRaises(ValueError): self.apply(hira=[self.hira,self.hira])
    def test_duplicate_branch_rejected_and_newer_status_retained(self):
        duplicate={**self.record,'id':'duplicate','address':self.edit['address']}
        with self.assertRaises(ValueError):self.apply(records=[self.record,duplicate])
        self.record.update(faceSignVerifiedAt='2026-11-08',faceSignStatus='unavailable',onnuriSourceDate='2026-11-08',onnuriSupported=False)
        self.apply()
        self.assertEqual(self.record['faceSignStatus'],'unavailable')
        self.assertFalse(self.record['onnuriSupported'])
