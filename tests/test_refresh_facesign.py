import unittest
from copy import deepcopy

from test_facesign import hira, snapshot, merge
from refresh_facesign import refresh


class RefreshTests(unittest.TestCase):
    def setUp(self):
        self.hira = [hira(name=f'테스트{i}약국') for i in range(5)]
        self.snapshot = snapshot()
        self.snapshot['coverage'] = '공식 지도에서 확인한 부분 목록'
        self.snapshot['stores'] = [{'name': h['요양기관명'], 'address': h['주소']} for h in self.hira]
        self.records, _ = merge([], self.hira, self.snapshot)
        for r in self.records:
            r['faceSignVerifiedAt'] = '2026-11-03'
        self.manifest = {'hiraDate': '2026-09-30', 'sourceDate': '2026-07-31',
                         'faceSignSourceDate': '2026-11-03', 'faceSignVerifiedCount': 5}

    def test_partial_observation_preserves_missing_record_and_date(self):
        self.snapshot['stores'].pop()
        before = deepcopy(self.records)
        records, metadata, report = refresh(self.records, self.manifest, self.hira, self.snapshot)
        self.assertEqual(self.records, before)
        self.assertEqual(len(records), 5)
        self.assertEqual(records[-1]['faceSignVerifiedAt'], '2026-11-03')
        self.assertEqual(records[0]['faceSignVerifiedAt'], '2026-11-04')
        self.assertIsNone(records[0]['onnuriSupported'])
        self.assertEqual(metadata['sourceDate'], '2026-07-31')
        self.assertEqual(metadata['faceSignRefreshedCount'], 4)
        self.assertEqual(report['retainedWithoutReverification'], 1)

    def test_empty_or_unexpectedly_small_collection_is_rejected(self):
        for size in (0, 3):
            data = deepcopy(self.snapshot)
            data['stores'] = data['stores'][:size]
            with self.assertRaises(ValueError):
                refresh(self.records, self.manifest, self.hira, data)

    def test_old_snapshot_cannot_move_verification_date_backwards(self):
        self.snapshot['checkedAt'] = '2026-11-02'
        with self.assertRaises(ValueError):
            refresh(self.records, self.manifest, self.hira, self.snapshot)


if __name__ == '__main__':
    unittest.main()
