import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('sync_packages', Path(__file__).with_name('sync-packages.py'))
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class SaleExtraction(unittest.TestCase):
    def setUp(self):
        self.names = sync.read_names()
    def extract(self, text, title='[공지] 업데이트 안내', date='2026-03-25'):
        return sync.extract({'id': 1, 'title': title, 'date': date, 'text': text, 'images': []}, self.names)['events']
    def test_publication_is_not_sale_start(self):
        result = self.extract('솔라 패키지 판매\n판매 일정\n2026년 3월 26일 00:00 ~ 4월 8일 23:59')
        self.assertEqual(result[0]['start'], '2026-03-26')
    def test_multiple_sections_keep_their_own_periods(self):
        text = '2. 강림 패키지 판매\n판매 일정\n2025.10.15 ~ 2025.10.21\n3. 블랙티어 패키지 판매\n판매 일정\n2025.10.18 ~ 2025.10.31'
        result = self.extract(text, date='2025-10-15')
        self.assertEqual([(r['name'], r['start']) for r in result], [('블랙티어 드래곤', '2025-10-18')])
    def test_no_invented_date_for_image_only_content(self):
        self.assertEqual(self.extract('판매 일정 추후 안내', title='[안내] 솔라 패키지'), [])
    def test_year_rollover_and_two_digit_year(self):
        result = self.extract('혼 패키지\n판매 기간: 22년 12월 08일 ~ 23년 1월 10일', date='2022-12-06')
        self.assertEqual(result[0]['end'], '2023-01-10')
    def test_rewards_do_not_create_package_sales(self):
        self.assertEqual(self.extract('솔라 출석 보상\n이벤트 기간: 2026.03.26 ~ 2026.04.08\n패키지 결제 시 보상 지급'), [])
    def test_prefix_dragon_is_not_a_second_sale(self):
        result = self.extract('렉몰리버스 패키지 판매\n판매 기간: 2021년 6월 1일 ~ 6월 7일', date='2021-05-31')
        self.assertEqual([r['name'] for r in result], ['렉몰 리버스'])


if __name__ == '__main__':
    unittest.main()
