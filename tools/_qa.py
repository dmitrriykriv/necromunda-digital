# -*- coding: utf-8 -*-
"""Проверяет, что весь текст исходников попал в gangs.html."""
import html
import re
import sys
from collections import Counter
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

TOOLS = Path(__file__).resolve().parent
PAGES = TOOLS.parent / 'pages'

raw = open(TOOLS / 'gangs_raw.txt', encoding='utf-8').read()
doc = open(PAGES / 'gangs.html', encoding='utf-8').read()

raw = raw.split('=== PAGE 2 ===', 1)[1]
raw = re.sub(r'=== PAGE \d+ ===', ' ', raw)

text = html.unescape(re.sub(r'<[^>]+>', ' ', doc))

TOK = re.compile(r"[A-Za-z][A-Za-z'\u2019\-]{2,}|\d+\+?|\d+[\u201d\"]")


def toks(s):
    return Counter(t.lower() for t in TOK.findall(s))


a, b = toks(raw), toks(text)
lost = {w: a[w] - b.get(w, 0) for w in a if a[w] > b.get(w, 0)}
print('уникальных токенов в PDF банд: %d' % len(a))
print('токенов с потерями: %d (всего вхождений %d)'
      % (len(lost), sum(lost.values())))
for w, c in sorted(lost.items(), key=lambda kv: -kv[1])[:25]:
    print('   %-24s -%d  (в PDF %d, в HTML %d)' % (w, c, a[w], b.get(w, 0)))

print()
ids = re.findall(r'id="([^"]+)"', doc)
dup = [i for i, n in Counter(ids).items() if n > 1]
print('дубли id: %d %s' % (len(dup), sorted(dup)[:12]))
anchors = set(re.findall(r'href="#([^"]+)"', doc))
print('битые якоря:', sorted(anchors - set(ids))[:12])

bad = 0
for tnum, tbl in enumerate(re.findall(r'<table.*?</table>', doc, re.S), 1):
    head = re.search(r'<thead>.*?</thead>', tbl, re.S)
    if not head:
        continue
    ncols = len(re.findall(r'<th(?:\s[^>]*)?>', head.group(0)))
    body = tbl.split('<tbody>')[-1]
    for i, row in enumerate(re.findall(r'<tr[^>]*>(.*?)</tr>', body, re.S)):
        k = 0
        for cell in re.findall(r'<t[dh][^>]*>', row):
            m = re.search(r'colspan="(\d+)"', cell)
            k += int(m.group(1)) if m else 1
        if k != ncols:
            bad += 1
            if bad <= 12:
                print('таблица %d строка %d: ячеек %d, в шапке %d'
                      % (tnum, i + 1, k, ncols))
print('строк таблиц с неверным числом ячеек: %d' % bad)

print()
opened = len(re.findall(r'<details[ >]', doc))
closed = len(re.findall(r'</details>', doc))
print('details: открыто %d, закрыто %d' % (opened, closed))
for cls, label in (('fold-fighters', 'блоков с бойцами'),
                   ('fold-equip', 'списков снаряжения'),
                   ('fold-gear', 'блоков экипировки')):
    print('%s: %d' % (label, len(re.findall(r'<details class="fold %s">' % cls, doc))))
print('карточек бойцов: %d' % len(re.findall(r'<details class="fighter"', doc)))
print('раскрываемых позиций: %d'
      % len(re.findall(r'<details class="equip-item">', doc)))
print('позиций без профиля: %d' % len(re.findall(r'class="equip-plain"', doc)))
