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
        result=self.extract('판매 일정 추후 안내', title='[안내] 솔라 패키지 판매 안내')
        self.assertEqual(result[0]['start'], None)
        self.assertEqual(result[0]['dateBasis'], 'notice')
    def test_year_rollover_and_two_digit_year(self):
        result = self.extract('혼 패키지\n판매 기간: 22년 12월 08일 ~ 23년 1월 10일', date='2022-12-06')
        self.assertEqual(result[0]['end'], '2023-01-10')
    def test_rewards_do_not_create_package_sales(self):
        self.assertEqual(self.extract('솔라 출석 보상\n이벤트 기간: 2026.03.26 ~ 2026.04.08\n패키지 결제 시 보상 지급'), [])
    def test_prefix_dragon_is_not_a_second_sale(self):
        result = self.extract('렉몰리버스 패키지 판매\n판매 기간: 2021년 6월 1일 ~ 6월 7일', date='2021-05-31')
        self.assertEqual([r['name'] for r in result], ['렉몰 리버스'])

    def test_removed_dates_are_not_live_dates(self):
        parser = sync.PlainText()
        parser.feed('<p>유니버스 패키지</p><p>23년 3월 <s>18일 00:00</s>21일 10:00 ~ 23년 <span style="text-decoration: line-through"><b>3월 31일</b></span>4월 3일 23:59</p>')
        result = self.extract(''.join(parser.parts), date='2023-03-16')
        self.assertEqual((result[0]['start'], result[0]['end']), ('2023-03-21', '2023-04-03'))
    def test_bundle_names_after_date_do_not_take_next_section_date(self):
        text = '[단계추가 기념 패키지 판매]\n판매 기간: 2019/10/8 ~ 10/14\n최대 구매: 3회\n-므네이아 패키지\n-아실리 패키지\n-위드미 패키지\n[엔투라스 패키지 판매]\n판매 기간: 2019/10/15 ~ 10/21'
        result = self.extract(text, date='2019-10-04')
        self.assertEqual({r['name']:r['start'] for r in result}, {'므네이아':'2019-10-08', '아실리':'2019-10-08', '위드미':'2019-10-08', '엔투라스':'2019-10-15'})
    def test_shared_period_before_multiple_package_headers(self):
        result = self.extract('판매 기간: 2019/11/6 ~ 11/12\n[말덱 패키지]\n[스트라 패키지]', date='2019-11-01')
        self.assertEqual({r['name'] for r in result}, {'말덱', '스트라'})
    def test_currency_and_daily_replacement_are_not_dragon_sales(self):
        text = '시타엘 패키지\n판매 기간: 2018/9/19 ~ 9/30\n신규 일일 패키지 드래곤인 헬 스페로우의 등장에 따라 기존에 판매하던 프로딘은 9/19까지만 판매\n골드 상점과 패키지 추가'
        self.assertEqual([r['name'] for r in self.extract(text, date='2018-09-17')], ['시타엘'])
    def test_included_dragon_with_particle_is_not_missed(self):
        result = self.extract('6. 종합 선물 패키지 판매\n드래곤 혼이 포함된 종합 선물 패키지가 판매됩니다.\n판매 일정: 2025/9/24 ~ 2025/10/31', date='2025-09-23')
        self.assertEqual([r['name'] for r in result], ['혼'])

    def test_sale_ending_notice_is_not_another_sale(self):
        self.assertEqual(self.extract('▶[판매 종료]\n아래 상품 판매가 종료됩니다.\n쿠로이 패키지\n그레이탄 패키지\n기존 패키지 렉몰 리버스는 17일 까지만 구매 가능'), [])
    def test_requested_dragons_are_excluded(self):
        result=self.extract('수룡, 히드라곤, 청룡, 백룡, 흑룡 패키지 판매\n2026.03.26 ~ 2026.04.08')
        self.assertEqual(result, [])


if __name__ == '__main__':
    unittest.main()
