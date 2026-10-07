"""Sync publicly available Dragon Village notices into the package history.

Uses only the Python standard library. Ambiguous/image-only announcements stay
in the notice index and never create an invented sale date or recurrence.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
KST = timezone(timedelta(hours=9))
DATE = re.compile(r'(?:(?P<year>20\d{2}|\d{2})\s*(?:년|[./-])\s*)?(?P<month>\d{1,2})\s*(?:월|[./-])\s*(?P<day>\d{1,2})\s*일?')


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.images = 0
        self.deleted_tags = []
    def handle_starttag(self, tag, attrs):
        void = tag in ['img', 'br', 'hr', 'input', 'meta', 'link', 'wbr']
        deleted = tag in ['s', 'strike', 'del'] or 'line-through' in (dict(attrs).get('style', '') or '')
        if self.deleted_tags or deleted:
            if not void:
                self.deleted_tags.append(tag)
            return
        if tag in ['p', 'div', 'br', 'li', 'tr', 'h1', 'h2', 'h3']:
            self.parts.append('\n')
        if tag == 'img':
            self.images += 1
    def handle_endtag(self, tag):
        if self.deleted_tags:
            if tag in self.deleted_tags:
                at = len(self.deleted_tags)-1-self.deleted_tags[::-1].index(tag)
                del self.deleted_tags[at:]
            return
        if tag in ['td', 'th']:
            self.parts.append(' | ')
        if tag in ['p', 'div', 'li', 'tr']:
            self.parts.append('\n')
    def handle_data(self, text):
        if not self.deleted_tags:
            self.parts.append(text)


def fetch_page(page):
    payload = json.dumps({'page': page, 'limit': 100, 'searchType': '', 'search': ''}).encode()
    for attempt in range(4):
        try:
            request = urllib.request.Request(
                'https://www.dragonvillage.net/notice/list', data=payload,
                headers={'Content-Type': 'application/json; charset=UTF-8',
                         'User-Agent': 'dogam-package-history/1.0',
                         'Referer': 'https://www.dragonvillage.net/notice'})
            with urllib.request.urlopen(request, timeout=60) as response:
                data = json.load(response)
            rows = []
            for record in data.get('list') or []:
                parser = PlainText()
                parser.feed(record.get('bcontent') or '')
                text = re.sub(r'[\t \xa0\ufeff\u200b]+', ' ', ''.join(parser.parts))
                rows.append({'id': record['bno'], 'title': record['bsubject'],
                             'date': record['regDate'][:10], 'text': text,
                             'images': parser.images,
                             'mentionsPackage': '패키지' in record['bsubject'] + (record.get('bcontent') or '')})
            return data['totalCount'], rows
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 * (attempt + 1))


def read_names():
    # The database uses JavaScript object literals; only quoted Korean name
    # fields and their preceding numeric IDs are needed here.
    source = (ROOT / 'dragons.js').read_text(encoding='utf-8')
    records = []
    for match in re.finditer(r'\b["\']?id["\']?\s*:\s*(\d+)\s*,\s*["\']?name["\']?\s*:\s*\{\s*["\']?ko["\']?\s*:\s*["\']([^"\']+)', source):
        name = match[2]
        variants = {name, name.replace(' 드래곤', '')}
        variants.update(v.replace(' ', '') for v in list(variants))
        records.append({'id': int(match[1]), 'name': name, 'variants': variants})
    if len(records) < 700:
        raise ValueError('Dragon name schema changed; refusing to publish incomplete data')
    return records


def parsed_date(match, year, month=None):
    if match.group('year'):
        year = int(match.group('year'))
        if year < 100:
            year += 2000
    return date(year, int(match.group('month')), int(match.group('day')))


def ranges(lines, published):
    result = []
    for i, line in enumerate(lines):
        if not re.search(r'~|∼|～|부터', line):
            continue
        before, after = re.split(r'~|∼|～|부터', line, maxsplit=1)
        starts = list(DATE.finditer(before))
        end_match = DATE.search(after)
        if not starts or not end_match:
            continue
        context = ' '.join(lines[max(0, i-3):i+1])
        if not re.search(r'판매|구매|패키지', context):
            continue
        if re.search(r'(이벤트|교환|사용|접속|수령|획득)\s*(가능\s*)?기간', line) and '판매' not in line:
            continue
        try:
            start = parsed_date(starts[-1], int(published[:4]))
            end = parsed_date(end_match, start.year)
            if end < start and start.month == 12 and end.month == 1:
                end = end.replace(year=end.year+1)
            if not 0 <= (end-start).days <= 366 or abs((start-date.fromisoformat(published)).days) > 120:
                continue
        except ValueError:
            continue
        label = next((l for l in reversed(lines[max(0,i-4):i]) if '패키지' in l and len(l)<100), '판매 일정')
        label = re.sub(r'^[\d.)\[\]■●★▣\s-]+|[\[\]]', '', label).strip()
        result.append({'line': i, 'start': start.isoformat(), 'end': end.isoformat(), 'label': label})
    return result


def extract(notice, names):
    text = notice['text']
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    periods = ranges(lines, notice['date'])
    matches = []
    # A package label must name the dragon. General reward/drop mentions and
    # biographies are not package sales, even when the notice contains a sale.
    for i, line in enumerate([notice['title']] + lines):
        if '패키지' not in line or len(line) > 200:
            continue
        if re.search(r'불가|정상화|문제|결제 관련|보상|획득처|소급|조정 안내|구성품 변경|까지만.*구매|판매.?종료|일일.?패키지|초보자.?패키지|스타터.?패키지', line):
            continue
        label = line
        if '패키지 품목' in line:
            label = line.split('패키지 품목', 1)[1]
        for dragon in names:
            if dragon['name'].replace(' ', '') in ['골드드래곤', '헬드래곤', '수룡', '히드라곤', '청룡', '백룡', '흑룡']:
                continue
            if not any(v in label for v in dragon['variants']):
                continue
            found = any(re.search(r'(?<![가-힣A-Za-z])' + re.escape(v) + r'(?=$|[^가-힣A-Za-z]|의\s|을\s|를\s|은\s|는\s|이\s|가\s)', label)
                        for v in dragon['variants'])
            if found:
                matches.append((dragon, i-1))
    events = {}
    for dragon, index in matches:
        if not periods:
            # Use the announcement date only as an explicitly marked fallback.
            # Operational/reward/ending notices are not new sale announcements.
            heading = next((l for l in reversed(lines[:max(0,index)]) if re.match(r'^(?:[▶■▣<]|\d+[.)]|\[)', l)), '')
            context = notice['title']+' '+heading+' '+(lines[index] if index>=0 else '')
            if re.search(r'판매.?종료|판매.?중지|판매.?중단|결제|오류|문제|정상화|보상|일일.?패키지|초보자|스타터|획득처|관련 안내', context):
                continue
            if not re.search(r'판매|신규|추가|출시|기념|패키지.*안내', context):
                continue
            events[(dragon['id'], None)] = {'dragonId':dragon['id'], 'name':dragon['name'],
                'start':None, 'end':None, 'noticeId':notice['id'], 'dateBasis':'notice',
                'evidence':'판매 안내 공지 기준 · 실제 판매 기간 미확정'}
            continue
        # Main titles apply to a single period only. Notices with several sales
        # need an explicit package subsection, so avoid assigning all dates.
        if index == -1 and len(periods) > 1:
            continue
        ranked = sorted(periods, key=lambda p: (p['line'] < index, abs(p['line']-index)))
        period = None
        if index >= 0:
            for candidate in ranked:
                lo, hi = sorted((index, candidate['line']))
                if hi-lo > 18:
                    continue
                if candidate['line'] < index and re.match(r'^\d+[.)]\s', lines[index]):
                    continue
                intervening = lines[lo+1:hi]
                if any(re.match(r'^\d+[.)]\s', l) or (candidate['line'] > index and re.fullmatch(r'\[.*패키지.*\]', l) and '품목' not in l and '구성' not in l) for l in intervening):
                    continue
                period = candidate
                break
        else:
            period = ranked[0]
        if period is None:
            continue
        key = (dragon['id'], period['start'])
        events[key] = {'dragonId': dragon['id'], 'name': dragon['name'],
                       'start': period['start'], 'end': period['end'], 'noticeId': notice['id']}
    return {'id': notice['id'], 'title': notice['title'], 'date': notice['date'],
            'url': f"https://www.dragonvillage.net/notice/{notice['id']}",
            'events': list(events.values()), 'periods': [{k: p[k] for k in ['start', 'end', 'label']} for p in periods],
            'hasImages': bool(notice['images'])}


def build(rows, previous, total, names, full):
    notices = {} if full else {n['id']: n for n in previous.get('notices', [])}
    ids = set() if full else set(previous.get('scannedIds', []))
    for row in rows:
        ids.add(row['id'])
        notices.pop(row['id'], None)
        if row.get('mentionsPackage') or '패키지' in row['title'] + row['text']:
            notices[row['id']] = extract(row, names)
    reviewed_path = ROOT / 'data' / 'pkg-reviewed.json'
    reviewed = json.loads(reviewed_path.read_text(encoding='utf-8')) if reviewed_path.exists() else {'events': []}
    by_name = {n['name']: n for n in names}
    for item in reviewed['events'] + reviewed.get('announcements', []):
        notice = notices.get(item['noticeId'])
        if not notice:
            raise ValueError(f"Reviewed source is missing: {item['noticeId']}")
        for name in item['names']:
            if name.replace(' ', '') in ['골드드래곤', '헬드래곤', '수룡', '히드라곤', '청룡', '백룡', '흑룡']:
                continue
            dragon = by_name[name]
            event = {'dragonId': dragon['id'], 'name': name, 'start': item.get('start'),
                     'end': item.get('end'), 'noticeId': item['noticeId'],
                     'price': item.get('price'), 'evidence': item['evidence']}
            notice['events'] = [e for e in notice['events'] if not (e['dragonId'] == dragon['id'] and e['start'] == item.get('start'))]
            if not item.get('start'):
                event['dateBasis'] = 'notice'
            notice['events'].append(event)
    for notice in notices.values():
        exact_ids = {e['dragonId'] for e in notice['events'] if e.get('start')}
        notice['events'] = [e for e in notice['events'] if e.get('start') or e['dragonId'] not in exact_ids]
    # A rerun on the same date/source is stable, avoiding empty daily commits.
    return {'schemaVersion': 1, 'checkedAt': datetime.now(KST).date().isoformat(),
            'source': 'https://www.dragonvillage.net/notice', 'totalCount': total,
            'scannedCount': len(ids), 'scannedIds': sorted(ids),
            'notices': sorted(notices.values(), key=lambda n: n['id'], reverse=True)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path)
    parser.add_argument('--full', action='store_true')
    parser.add_argument('--output', type=Path, default=ROOT / 'data' / 'pkg-notices.json')
    args = parser.parse_args()
    previous = json.loads(args.output.read_text(encoding='utf-8')) if args.output.exists() else {}
    names = read_names()
    full = args.full or not previous
    if args.input:
        rows = json.loads(args.input.read_text(encoding='utf-8'))
        total = len(rows)
        full = True
    else:
        total, rows = fetch_page(1)
        if full:
            import math
            with ThreadPoolExecutor(max_workers=3) as pool:
                futures = [pool.submit(fetch_page, p) for p in range(2, math.ceil(total/100)+1)]
                for f in as_completed(futures):
                    rows.extend(f.result()[1])
            if len({n['id'] for n in rows}) != total:
                raise ValueError('Notice list changed during scan; rerun before publishing')
        else:
            known = set(previous.get('scannedIds', []))
            page = 1
            while rows and not any(n['id'] in known for n in rows[-100:]):
                page += 1
                _, more = fetch_page(page)
                if not more:
                    break
                rows.extend(more)
    data = build(rows, previous, total, names, full)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(f"Scanned {data['scannedCount']}/{total}; package notices {len(data['notices'])}; sale references {sum(len(n['events']) for n in data['notices'])}")


if __name__ == '__main__':
    main()
