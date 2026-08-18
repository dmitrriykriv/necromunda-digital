# -*- coding: utf-8 -*-
"""Собирает gangs.html из текста, извлечённого из Правила/GANGS0_3.pdf.

Разбор опирается на регулярную структуру исходника: каждая банда начинается
с заголовка "<NAME> GANG LIST", далее идут особые правила, таблица доступа к
навыкам, карточки бойцов, список снаряжения и профили оружия.
"""
import html
import re
import sys
import unicodedata
from pathlib import Path

import gang_i18n as i18n

sys.stdout.reconfigure(encoding='utf-8')

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
PAGES = ROOT / 'pages'
RAW = TOOLS / 'gangs_raw.txt'
CORE_RAW = TOOLS / 'rules_raw.txt'
OUT = PAGES / 'gangs.html'

# ---------------------------------------------------------------- банды

GANGS = [
    ('ASH WASTE NOMAD GANG LIST', 'Кочевники Пепельных пустошей', 'other'),
    ('CHAOS HELOT CULT LIST', 'Культ хаоситских илотов', 'cult'),
    ('CORPSE GRINDER CULT GANG LIST', 'Культ Трупорезов', 'cult'),
    ('FREE OGRYN GANG LIST', 'Свободные огрины', 'other'),
    ('GENESTEALER CULT GANG LIST', 'Культ генокрадов', 'cult'),
    ('HOUSE CAWDOR GANG LIST', 'Дом Каудор', 'house'),
    ('HOUSE DELAQUE GANG LIST', 'Дом Делак', 'house'),
    ('HOUSE ESCHER GANG LIST', 'Дом Эшер', 'house'),
    ('BLADES OF THE MATRIARCH GANG LIST', 'Клинки Матриарха', 'offshoot'),
    ('HOUSE GOLIATH GANG LIST', 'Дом Голиаф', 'house'),
    ('FORGE SMELTERS GANG LIST', 'Плавильщики кузниц', 'offshoot'),
    ('HOUSE ORLOCK GANG LIST', 'Дом Орлок', 'house'),
    ('HOUSE VAN SAAR GANG LIST', 'Дом Ван Саар', 'house'),
    ('IRONHEAD SQUAT GANG LIST', 'Сквоты Айронхед', 'other'),
    ('MALSTRAIN GANG LIST', 'Мальстрейн', 'cult'),
    ('OUTCAST GANG LIST', 'Изгои', 'other'),
    ('PALANITE ENFORCER PATROL LIST', 'Паланитские энфорсеры', 'other'),
    ('SPYRE HUNTING PARTY LIST', 'Охотники Шпиля', 'other'),
    ('VENATOR GANG LIST', 'Венаторы', 'other'),
]

GROUPS = [
    ('house', 'Кланы-дома', 'Clan Houses'),
    ('offshoot', 'Ответвления домов', 'House Offshoots'),
    ('cult', 'Культы и мутанты', 'Cults &amp; Mutants'),
    ('other', 'Прочие банды', 'Other Gangs'),
]

# ---------------------------------------------------------------- шаблоны

FIGHTER_HEAD = re.compile(r'^([A-Z0-9][A-Z0-9\u2019\'&\-\.\*/ ]+?)\s+(\d+)\s+CREDITS$')
STAT_A1 = re.compile(r'^M\s+WS\s+BS\s+S\s+T\s+W\s+I\s+A\s+Sv$')
STAT_A2 = re.compile(r'^Ld\s+Cl\s+Wil\s+Int\s+Type\s+Starting XP$')
STAT_B = re.compile(r'^M\s+WS\s+BS\s+S\s+T\s+W\s+I\s+A\s+Sv\s+Ld\s+Cl\s+Wil\s+Int\s+Starting XP$')
TYPE_LINE = re.compile(r'^(?:Fighter|Vehicle|Crew)\s*\(.+\)$')
SKILL_HDR = re.compile(r'^Agility\s+Brawn\s+Combat\s+Cunning\s+Savant\s+Shooting$')
SKILL_ROW = re.compile(r'^(.+?)((?:\s+(?:Primary|Secondary|-)){2,6})$')
RANK_HDR = re.compile(r'^Primary\s+Secondary$')
WEAP_HDR = re.compile(r'^(.*?)\s*SR\s+LR\s+Str\s+AP\s+L\s+Traits(\s+Creds\s+TP)?$')
EQUIP_ROW = re.compile(r'^\s*[\u2022\-]?\s*(.+?)\.{2,}\s*(\+?)(\d+)\s*credits\.?$', re.I)
BULLET = re.compile(r'^\s*(?:[\u2022]|-)\s+(.+)$')
NAMED_RULE = re.compile(r'^([A-Z][A-Za-z\u2019\'\-\(\)0-9 ]{1,48}):\s+(\S.*)$')
DICE_HDR = re.compile(r'^(D66|D6|D3|2D6)\s+(.+)$')
DICE_ROW = re.compile(r'^(\d{1,2}(?:\s*-\s*\d{1,2})?)\s+(\S.*)$')
SR_TOKEN = re.compile(r'^(E|T|\*|-|\d+[\u201d"])$')
LR_TOKEN = re.compile(r'^(-|\*|\d+[\u201d"])$')
STR_TOKEN = re.compile(r'^(S([+\-]\d)?|\d+|-|\*)$')
AP_TOKEN = re.compile(r'^(-?\d+|-|\*)$')
L_TOKEN = re.compile(r'^(\d+|-|\*)$')
CREDS_TAIL = re.compile(r'^(\+?\d+|-)\s+([A-Z]|\d+|-)$')
CREDS_SOLO = re.compile(r'^(\+\d+|-)$')

EQUIP_SECTION = re.compile(r'EQUIPMENT LIST$')


def is_heading(line):
    if not line or len(line) > 90:
        return False
    letters = [c for c in line if c.isalpha()]
    if len(letters) < 3:
        return False
    return all(c.isupper() for c in letters)


def slug(text):
    text = unicodedata.normalize('NFKD', text)
    text = re.sub(r'[^A-Za-z0-9]+', '-', text).strip('-').lower()
    return text


def esc(text):
    return html.escape(text, quote=False)


# ---------------------------------------------------------------- разбор

def load_lines():
    raw = open(RAW, encoding='utf-8').read().split('\n')
    return [l.rstrip() for l in raw if not re.match(r'^=== PAGE \d+ ===$', l)]


def split_gangs(lines):
    """Возвращает [(title, ru, group, section_lines)] пропуская оглавление."""
    titles = {g[0]: g for g in GANGS}
    marks = []
    for i, line in enumerate(lines):
        s = line.strip()
        if s in titles and '...' not in s:
            marks.append((i, s))
    # первое вхождение каждого заголовка — в оглавлении оно с точками, так что
    # marks уже содержит только настоящие заголовки разделов
    seen, clean = set(), []
    for i, s in marks:
        if s not in seen:
            seen.add(s)
            clean.append((i, s))
    out = []
    for n, (i, s) in enumerate(clean):
        end = clean[n + 1][0] if n + 1 < len(clean) else len(lines)
        _, ru, group = titles[s]
        out.append((s, ru, group, lines[i + 1:end]))
    return out


def parse_stat_row(tokens, n):
    """Дополняет/обрезает строку характеристик до n значений."""
    if len(tokens) < n:
        tokens = tokens + ['-'] * (n - len(tokens))
    return tokens[:n]


GROUP_ROW = re.compile(r'^(.+?)\s+(-|\d+)\s+([A-Z]|\d+|-)$')


def weapon_anchor(toks):
    """Индекс колонки SR в разбитой на токены строке профиля.

    Опознаём не пару SR+LR, а всю пятёрку SR LR Str AP L: у гранат SR равен
    «-», и без проверки остальных колонок такой якорь ловил бы ложные строки.
    """
    for i in range(len(toks) - 4):
        if not (SR_TOKEN.match(toks[i]) and LR_TOKEN.match(toks[i + 1])):
            continue
        if toks[i] == '-' and toks[i + 1] == '-':
            continue
        if (STR_TOKEN.match(toks[i + 2]) and AP_TOKEN.match(toks[i + 3])
                and L_TOKEN.match(toks[i + 4])):
            return i
    return None


def parse_weapon_row(line, has_creds, allow_empty_name=False):
    """Разбирает строку профиля оружия. None — если это не строка профиля."""
    toks = line.split()
    anchor = weapon_anchor(toks)
    if anchor is None or (anchor == 0 and not allow_empty_name):
        return None
    rest = toks[anchor:]
    if len(rest) < 5:
        return None
    tail = rest[5:]
    creds = tp = ''
    if has_creds and len(tail) >= 2 and re.match(r'^(\+?\d+|-)$', tail[-2]) \
            and re.match(r'^([A-Z]|\d+|-)$', tail[-1]):
        creds, tp = tail[-2], tail[-1]
        tail = tail[:-2]
    elif has_creds and tail and re.match(r'^\+\d+$', tail[-1]):
        creds = tail[-1]
        tail = tail[:-1]
    return {
        'name': ' '.join(toks[:anchor]), 'sr': rest[0], 'lr': rest[1],
        'str': rest[2], 'ap': rest[3], 'l': rest[4],
        'traits': ' '.join(tail), 'creds': creds, 'tp': tp, 'group': False,
    }


def scan_weapon_table(lines, start, has_creds, is_stop):
    """Читает тело таблицы оружия, начиная со строки start.

    Возвращает (строки, индекс первой неразобранной строки). Учитывает три
    особенности исходника: строки-группы у составного оружия (комби-оружие,
    гранатомёты), названия, перенесённые на отдельную строку, и перенос
    колонки признаков.
    """
    rows = []
    pending_name = []
    j = start
    n = len(lines)
    while j < n:
        s = lines[j].strip()
        if not s:
            j += 1
            continue
        if is_stop(s):
            break

        row = parse_weapon_row(s, has_creds)
        if row:
            rows.append(row)
            pending_name = []
            j += 1
            continue

        # характеристики без названия — название стоит на предыдущих строках
        # либо потерялось при извлечении текста из PDF
        row = parse_weapon_row(s, has_creds, allow_empty_name=True)
        if row:
            row['name'] = ' '.join(pending_name)
            rows.append(row)
            pending_name = []
            j += 1
            continue

        gm = GROUP_ROW.match(s)
        if gm and has_creds and not pending_name:
            rows.append({'name': gm.group(1), 'creds': gm.group(2), 'tp': gm.group(3),
                         'sr': '', 'lr': '', 'str': '', 'ap': '', 'l': '',
                         'traits': '', 'group': True})
            j += 1
            continue

        # в основных правилах колонки Creds и TP часто переносятся под строку
        last = next((r for r in reversed(rows) if not r['group']), None)
        if has_creds and last is not None and not last['creds']:
            ct = CREDS_TAIL.match(s)
            if ct:
                last['creds'], last['tp'] = ct.group(1), ct.group(2)
                j += 1
                continue
            if CREDS_SOLO.match(s):
                last['creds'] = s
                j += 1
                continue

        # метки составного оружия: их легко спутать с названием, перенесённым
        # на отдельную строку, поэтому проверяем до всех эвристик
        if COMPONENT.match(s):
            rows.append({'name': s, 'creds': '', 'tp': '', 'sr': '', 'lr': '',
                         'str': '', 'ap': '', 'l': '', 'traits': '', 'group': True})
            j += 1
            continue

        # продолжение колонки признаков
        wraps = bool(rows) and not rows[-1]['group'] and (
            s.startswith('(') or s[:1].islower() or rows[-1]['traits'].endswith(','))
        if wraps and not pending_name:
            rows[-1]['traits'] = (rows[-1]['traits'] + ' ' + s).strip()
            j += 1
            continue

        # название, перенесённое на отдельную строку: следом должны идти
        # характеристики без названия
        stats_ahead = False
        for k in range(j + 1, n):
            t = lines[k].strip()
            if not t:
                continue
            if is_stop(t) or k > j + 3:
                break
            if weapon_anchor(t.split()) == 0:
                stats_ahead = True
                break
            if parse_weapon_row(t, has_creds):
                break
        if stats_ahead:
            pending_name.append(s)
            j += 1
            continue

        # строка-группа без цены ("Shotgun"); в отличие от переноса признаков
        # здесь нет ни запятой, ни скобки со значением свойства. Пока у
        # предыдущего профиля не заполнена цена, он считается незакрытым — тогда
        # короткая строка это продолжение признаков, а не новая группа
        closed = not has_creds or last is None or bool(last['creds'] or last['tp'])
        if (closed and s[:1].isupper() and len(s.split()) <= 4
                and ',' not in s and '(' not in s and not s.endswith('.')):
            rows.append({'name': s, 'creds': '', 'tp': '', 'sr': '', 'lr': '',
                         'str': '', 'ap': '', 'l': '', 'traits': '', 'group': True})
            j += 1
            continue

        if rows and not rows[-1]['group']:
            rows[-1]['traits'] = (rows[-1]['traits'] + ' ' + s).strip()
            j += 1
            continue

        break
    return rows, j


def parse_section(lines):
    """Превращает строки раздела банды в список блоков."""
    blocks = []
    i = 0
    n = len(lines)
    in_equipment = False

    def flush_prose(buf):
        if buf:
            blocks.append(('prose', ' '.join(buf)))

    prose = []

    def push(kind, payload):
        flush_prose(prose)
        prose.clear()
        blocks.append((kind, payload))

    while i < n:
        line = lines[i].strip()
        if not line:
            i += 1
            continue

        # --- карточка бойца ------------------------------------------------
        m = FIGHTER_HEAD.match(line)
        if m and i + 1 < n:
            nxt = lines[i + 1].strip()
            fighter = None
            if STAT_A1.match(nxt) and i + 4 < n and STAT_A2.match(lines[i + 3].strip()):
                stats = parse_stat_row(lines[i + 2].split(), 9)
                tail = lines[i + 4].split()
                sec = parse_stat_row(tail[:4], 4)
                rest = ' '.join(tail[4:])
                xp = ''
                mx = re.match(r'^(.*?)\s+(\d+)$', rest)
                ftype = rest
                if mx:
                    ftype, xp = mx.group(1), mx.group(2)
                fighter = {
                    'name': m.group(1).strip(), 'cost': m.group(2),
                    'type': ftype, 'xp': xp,
                    'profiles': [stats + sec], 'wide': False, 'rules': [],
                }
                i += 5
            elif TYPE_LINE.match(nxt):
                ftype = nxt
                j = i + 2
                intro = []
                while j < n and not STAT_B.match(lines[j].strip()):
                    if FIGHTER_HEAD.match(lines[j].strip()) or is_heading(lines[j].strip()):
                        break
                    intro.append(lines[j].strip())
                    j += 1
                if j < n and STAT_B.match(lines[j].strip()):
                    j += 1
                    profiles = []
                    while j < n:
                        toks = lines[j].split()
                        if len(toks) == 14 and re.match(r'^\d+[\u201d"]$', toks[0]):
                            profiles.append(toks)
                            j += 1
                        else:
                            break
                    fighter = {
                        'name': m.group(1).strip(), 'cost': m.group(2),
                        'type': ftype, 'xp': profiles[0][13] if profiles else '',
                        'profiles': profiles, 'wide': True, 'rules': [],
                        'intro': ' '.join(intro),
                    }
                    i = j
            if fighter:
                # правила бойца — до следующего заголовка/карточки/таблицы
                rules = []
                while i < n:
                    s = lines[i].strip()
                    if not s:
                        i += 1
                        continue
                    if FIGHTER_HEAD.match(s) or is_heading(s) or WEAP_HDR.match(s) \
                            or SKILL_HDR.match(s) or DICE_HDR.match(s) or STAT_A1.match(s):
                        break
                    rules.append(s)
                    i += 1
                fighter['rules'] = join_wrapped(rules)
                push('fighter', fighter)
                continue

        # --- таблица доступа к навыкам ------------------------------------
        if SKILL_HDR.match(line):
            rows = []
            j = i + 1
            while j < n:
                s = lines[j].strip()
                rm = SKILL_ROW.match(s)
                if not rm:
                    break
                vals = rm.group(2).split()
                rows.append([rm.group(1).strip()] + parse_stat_row(vals, 6))
                j += 1
            if rows:
                push('skills', rows)
                i = j
                continue

        # --- таблица рангов навыков (Venator) -----------------------------
        if RANK_HDR.match(line):
            rows = []
            j = i + 1
            while j < n:
                s = lines[j].strip()
                rm = re.match(r'^(.+?)\s+(\d(?:\s+and\s+\d)?)\s+(\d(?:\s+and\s+\d)?)$', s)
                if not rm:
                    break
                rows.append([rm.group(1), rm.group(2), rm.group(3)])
                j += 1
            if rows:
                push('ranks', rows)
                i = j
                continue

        # --- таблица профилей оружия --------------------------------------
        wm = WEAP_HDR.match(line)
        if wm:
            caption = wm.group(1).strip()
            has_creds = bool(wm.group(2))

            def stop(s):
                return bool(WEAP_HDR.match(s) or FIGHTER_HEAD.match(s)
                            or is_heading(s) or EQUIP_ROW.match(s))

            rows, j = scan_weapon_table(lines, i + 1, has_creds, stop)
            if rows:
                push('weapons', {'caption': caption, 'creds': has_creds, 'rows': rows})
                i = j
                continue

        # --- список снаряжения --------------------------------------------
        em = EQUIP_ROW.match(line)
        if em:
            items = []
            j = i
            while j < n:
                s = lines[j].strip()
                if not s:
                    j += 1
                    continue
                mm = EQUIP_ROW.match(s)
                if not mm:
                    break
                name = mm.group(1).strip()
                is_sub = (lines[j].lstrip().startswith('-')
                          or lines[j].startswith('   '))
                # длинные названия переносятся, и на строку с ценой попадает
                # только хвост — собираем его с предыдущими строками до маркера
                if not is_sub and j > 0 and (name.startswith('(')
                                             or name[:1].islower()):
                    parts, k, found = [], j - 1, False
                    while k >= 0 and j - k <= 3:
                        prev = lines[k].strip()
                        if not prev or is_heading(prev) or EQUIP_ROW.match(prev):
                            break
                        bm2 = BULLET.match(lines[k])
                        parts.insert(0, bm2.group(1).strip() if bm2 else prev)
                        k -= 1
                        if bm2:
                            found = True
                            break
                    if found:
                        name = ' '.join(parts) + ' ' + name
                items.append({'name': name,
                              'price': mm.group(2) + mm.group(3),
                              'sub': is_sub})
                j += 1
            if items:
                push('equipment', items)
                i = j
                continue

        # --- таблица с броском кубика --------------------------------------
        dm = DICE_HDR.match(line)
        if dm and i + 1 < n and DICE_ROW.match(lines[i + 1].strip()):
            head = line.split()
            wide = len(head) > 2 and all(len(h) <= 3 for h in head)
            cols = len(head)
            rows = []
            j = i + 1
            buf = None
            while j < n:
                s = lines[j].strip()
                if not s:
                    j += 1
                    continue
                rm = DICE_ROW.match(s)
                if rm and (not wide or len(s.split()) == cols):
                    if buf:
                        rows.append(buf)
                    if wide:
                        buf = s.split()
                    else:
                        buf = [rm.group(1).replace(' ', ''), rm.group(2)]
                elif buf and not wide and not is_heading(s) and not FIGHTER_HEAD.match(s):
                    buf[1] += ' ' + s
                else:
                    break
                j += 1
            if buf:
                rows.append(buf)
            if rows:
                push('dice', {'head': head, 'rows': rows, 'wide': wide})
                i = j
                continue

        # --- заголовки -----------------------------------------------------
        if is_heading(line):
            if EQUIP_SECTION.search(line):
                in_equipment = True
            level = 4 if in_equipment else 3
            if EQUIP_SECTION.search(line) or line == 'GANG SPECIAL RULES':
                level = 3
            push('heading', {'text': line, 'level': level})
            i += 1
            continue

        # --- маркированные пункты -------------------------------------------
        bm = BULLET.match(lines[i])
        if bm:
            items = []
            j = i
            while j < n:
                s = lines[j]
                bb = BULLET.match(s)
                if bb:
                    items.append({'text': bb.group(1).strip(),
                                  'sub': s.startswith('   ') or s.lstrip().startswith('-')})
                    j += 1
                elif items and s.strip() and not is_heading(s.strip()) \
                        and not FIGHTER_HEAD.match(s.strip()) and s.strip()[0].islower():
                    items[-1]['text'] += ' ' + s.strip()
                    j += 1
                else:
                    break
            # если у маркера цена оказалась на перенесённой строке, пункт
            # становится позицией снаряжения только после склейки
            runs = []
            for it in items:
                em2 = EQUIP_ROW.match(it['text'])
                kind2 = 'equipment' if em2 else 'bullets'
                if not runs or runs[-1][0] != kind2:
                    runs.append((kind2, []))
                runs[-1][1].append(
                    {'name': em2.group(1).strip(),
                     'price': em2.group(2) + em2.group(3),
                     'sub': it['sub']} if em2 else it)
            for kind2, payload2 in runs:
                push(kind2, payload2)
            i = j
            continue

        # --- обычный текст ----------------------------------------------------
        prose.append(line)
        if i + 1 < n:
            nxt = lines[i + 1].strip()
            ends = line.endswith(('.', ':', '!', '?'))
            cont = nxt and (not ends or (nxt[:1].islower()))
            special = (not nxt or is_heading(nxt) or FIGHTER_HEAD.match(nxt)
                       or BULLET.match(lines[i + 1]) or WEAP_HDR.match(nxt)
                       or SKILL_HDR.match(nxt) or EQUIP_ROW.match(nxt)
                       or DICE_HDR.match(nxt) or STAT_A1.match(nxt))
            if not cont or special:
                flush_prose(prose)
                prose.clear()
        else:
            flush_prose(prose)
            prose.clear()
        i += 1

    flush_prose(prose)
    return blocks


def join_wrapped(lines):
    """Склеивает перенесённые строки в абзацы."""
    out = []
    for line in lines:
        if out and not out[-1].endswith(('.', ':', '!', '?')) or \
                (out and line[:1].islower()):
            out[-1] += ' ' + line
        else:
            out.append(line)
    return out


# ------------------------------------------------- профили снаряжения

PRICE_LINE = re.compile(
    r'^(?:(?:[A-Z][A-Z\- ]*:\s*)?\+?\d+\s*credits?\s*[\u2013\u2014\-]\s*'
    r'(?:TP\s*\d+|Exclusive)|Exclusive)\s*$', re.I)
GLUED_PRICE = re.compile(
    r'^(.+?)(\+?\d+\s*CREDITS?\s*[\u2013\u2014\-]\s*(?:TP\s*\d+|Exclusive))$', re.I)
QUALIFIER = re.compile(r'^\(.+\)$')
COMPONENT = re.compile(r'^(Primary|Secondary) component$')


def norm_item(name):
    """Приводит название предмета к виду, пригодному для сопоставления."""
    s = unicodedata.normalize('NFKD', name).lower()
    s = s.replace('\u2019', "'").replace('\u2018', "'")
    s = re.sub(r'\s*\([^)]*\)', ' ', s)          # «(Stormcaller only)»
    s = re.sub(r'\s+with\s+.*$', ' ', s)          # «with frag & krak grenades»
    s = s.replace('*', ' ')
    s = re.sub(r"[^a-z0-9'/\- ]+", ' ', s)
    s = re.sub(r'\s*/\s*', '/', s)
    return re.sub(r'\s+', ' ', s).strip(" -'/")


def index_weapon_rows(rows, caption, store):
    """Индексирует строки таблицы оружия по названию вместе с подстроками."""
    parent = caption
    for n, row in enumerate(rows):
        name = row['name'].strip()
        if not name:
            continue
        if name.startswith('-'):
            # варианты боеприпасов вроде «- warp round» ищут отдельно
            key = norm_item(name.lstrip('- '))
            if key and key not in store:
                store[key] = {'kind': 'weapon', 'caption': parent,
                              'row': row, 'children': [], 'sub': True}
            continue
        parent = name
        children = []
        for nxt in rows[n + 1:]:
            nm = nxt['name'].strip()
            if nm.startswith('-') or (nxt['group'] and COMPONENT.match(nm)):
                children.append(nxt)
            else:
                break
        key = norm_item(name)
        # самостоятельный профиль важнее одноимённого варианта боеприпаса:
        # «Frag grenades» есть и как граната, и как выстрел к гранатомёту
        if key and (key not in store or store[key].get('sub')):
            store[key] = {'kind': 'weapon', 'caption': caption,
                          'row': row, 'children': children, 'sub': False}


def parse_wargear_blocks(lines, start, end, store):
    """Разбирает блоки вида «НАЗВАНИЕ / 25 CREDITS – TP 0 / описание»."""
    i = start
    while i < end:
        s = lines[i].strip()
        if not is_heading(s):
            i += 1
            continue

        name, inline_price = s, None
        gm = GLUED_PRICE.match(s)
        if gm and is_heading(gm.group(1).strip()):
            name, inline_price = gm.group(1).strip(), gm.group(2).strip()

        body_start = None
        j = i + 1
        while j < min(i + 4, end):
            t = lines[j].strip()
            if PRICE_LINE.match(t):
                body_start = j
                break
            if QUALIFIER.match(t):
                j += 1
                continue
            break

        if inline_price is None and body_start is None:
            i += 1
            continue

        # у брони варианты идут отдельными строками с ценой («LIGHT: …»,
        # «HEAVY: …»), они набраны капсом и не должны обрывать описание
        k = (body_start if body_start is not None else i) + 1
        while k < end:
            t = lines[k].strip()
            if is_heading(t) and not PRICE_LINE.match(t):
                break
            k += 1

        body = [l.strip() for l in lines[(body_start if body_start is not None
                                          else i + 1):k] if l.strip()]
        if inline_price:
            body.insert(0, inline_price)
        # цену держим отдельно, иначе она склеивается с первым абзацем описания
        prices, rest = [], []
        for line in body:
            if not rest and PRICE_LINE.match(line):
                prices.append(line)
            else:
                rest.append(line)
        key = norm_item(name)
        if key and key not in store:
            store[key] = {'kind': 'wargear', 'name': name,
                          'prices': prices, 'body': join_wrapped(rest)}
        i = k


def build_core_db():
    """Профили оружия и снаряжения из раздела Trading Post основных правил."""
    raw = open(CORE_RAW, encoding='utf-8').read().split('\n')
    lines = [l.rstrip() for l in raw if not re.match(r'^=== PAGE \d+ ===$', l)]

    start = next((n for n, l in enumerate(lines)
                  if l.strip() == 'TRADING POST'), 0)
    end = next((n for n, l in enumerate(lines)
                if l.strip() == 'WEAPON TRAITS' and n > start), len(lines))

    store = {}
    i = start
    while i < end:
        s = lines[i].strip()
        m = WEAP_HDR.match(s)
        if m:
            def stop(t):
                return bool(WEAP_HDR.match(t) or is_heading(t))

            rows, j = scan_weapon_table(lines, i + 1, bool(m.group(2)), stop)
            if rows:
                index_weapon_rows(rows, m.group(1).strip(), store)
                i = j
                continue
        i += 1

    parse_wargear_blocks(lines, start, end, store)
    return store


def build_gang_db(section_lines, blocks, gid):
    """Профили, специфичные для банды: её оружие, снаряжение и бойцы."""
    store = {}
    for kind, payload in blocks:
        if kind == 'weapons':
            index_weapon_rows(payload['rows'], payload['caption'], store)
    parse_wargear_blocks(section_lines, 0, len(section_lines), store)
    for kind, payload in blocks:
        if kind == 'fighter':
            key = norm_item(payload['name'])
            if key and key not in store:
                store[key] = {'kind': 'fighter', 'fighter': payload,
                              'anchor': fighter_id(gid, payload['name'])}
    return store


# Одни и те же предметы в разных книгах названы по-разному.
ALIASES = {
    'incendiary grenades': 'incendiary charges',
    'stun lance': 'shock lance',
}


def item_variants(name):
    """Варианты написания предмета для поиска в базе профилей."""
    base = norm_item(name)
    if not base:
        return []
    keys = [base]
    if base in ALIASES:
        keys.append(ALIASES[base])
    # «Light carapace armour» описан в блоке «Carapace armour»
    trimmed = re.sub(r'^(light|heavy)\s+', '', base)
    if trimmed != base:
        keys.append(trimmed)
    # «Combi-pistol (laspistol/meltagun)» и «Bolter/grenade launcher»
    # в таблицах записаны как «Combi-laspistol» и «Combi-bolter»
    paren = re.search(r'\(([^)]*/[^)]*)\)', name)
    if paren:
        first = norm_item(paren.group(1).split('/')[0])
        if first:
            keys.append('combi-' + first)
    if '/' in base:
        keys.append('combi-' + base.split('/')[0].strip())
        keys.append(base.split('/')[0].strip())
    out = []
    for k in keys:
        out.append(k)
        out.append(k[:-1] if k.endswith('s') else k + 's')
    return out


def lookup_item(name, *stores):
    """Ищет профиль предмета, пробуя разные написания названия."""
    variants = item_variants(name)
    for store in stores:
        for v in variants:
            if v in store:
                return store[v]
    return None


# ------------------------------------------------- свойства оружия (подсказки)

def trait_key(name):
    """Ключ свойства: без скобок, дефисы как пробелы. Rapid Fire (1) -> rapid fire."""
    s = unicodedata.normalize('NFKD', name)
    s = s.replace('\u2019', "'").replace('\u2018', "'")
    s = s.replace('\u201c', '"').replace('\u201d', '"').replace('\u2033', '"')
    s = s.lower()
    s = re.sub(r'\s*\([^)]*\)', '', s)
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


TRAIT_ALIASES = {
    'additional attack': 'additional attacks',
    'toxic': 'toxin',
}

# Русские расшифровки для подсказки. Английский оригинал подтягивается из правил.
TRAIT_RU = {
    'additional attacks': 'Оружие даёт X атак в ближнем бою сверх обычных. Только во время активации модели и только если оружие не назначено Primary или Secondary.',
    'ammo': 'После выстрела бросьте D6. Если результат не меньше X, патроны ещё есть. Иначе оружие сразу Out of Ammo, даже без кубика огневой мощи. Если Out of Ammo также выпал на кубике огневой мощи, оружие заклинивает до конца боя.',
    'arc': 'Ограниченные сектора обстрела, обозначенные X. Целиться можно только в модели в этом секторе.',
    'assault': 'После Dash носитель может выполнить Shoot этим оружием как свободное действие.',
    'auxiliary': 'Только как насадка на другое оружие, отдельно не берётся. Не занимает слот оружия.',
    'backstab': '+1 Strength, если цель Engaged более чем с одной моделью.',
    'blast': 'Поставьте маркер Blast 3" или 5" на цель. Попадание — маркер остаётся. Промах — рассейте на D6" по кубику рассеивания. Hit и 1 на рассеивании: осечка, маркер на стреляющем. Модели под маркером получают автоматическое попадание. С Rapid Fire (X) первый Blast как обычно, остальные рассеиваются от него.',
    'blaze': 'Если бросок на ранение не меньше X, цель получает ещё одно попадание тем же профилем. Оно бросается на ранение отдельно и не вызывает новых дополнительных попаданий.',
    'breaching': 'Если атака ранит и бросок на ранение не меньше X, спасброски брони делать нельзя.',
    'combi': 'При Shoot или Aimed Shot выберите профиль до броска. Можно стрелять обоими по одной цели с −1 к попаданию каждого; атаки одновременны.',
    'concussive': 'Если атака ранит и бросок на ранение не меньше X, цель снижает Initiative на 1 до конца следующей активации.',
    'cursed': 'Попавшая модель проходит Willpower или получает Insanity. Натуральная 1 на попадании: то же для носителя.',
    'damage': 'Раненая модель теряет X Wounds вместо одного. Число кубиков ранений всё равно равно Lethality оружия.',
    'drag': 'Если цель попала, но не выведена из боя, бросьте D6: при результате не ниже Strength цели её волокут на D3" к атакующему. Может вызвать падение или сцепление.',
    'flash': 'Броска на ранение нет: цель делает проверку Initiative, при провале Blind. Слепая модель теряет Ready; её атаки ближнего боя попадают только на натуральную 6 до следующей активации.',
    'gas': 'Спасброски брони нельзя. Респиратор даёт непробиваемый спасбросок 5+ против Wounds от этого оружия.',
    'graviton pulse': 'Вместо ранения модели в Blast делают проверку Strength; провал ранит без брони. Маркер остаётся как трудная местность до конца раунда; в End phase на 5+ остаётся ещё на раунд.',
    'heavy': 'Дальнобойное: только Braced Shot. Ближний бой: нельзя как Secondary и нельзя использовать Secondary вместе с ним.',
    'independent': 'Стреляет само, в дополнение к другой дальней атаке, и может в другую цель. Попадания с BS 4+, который нельзя модифицировать.',
    'knockback': 'Если попадание по бойцу и бросок попадания не меньше X, его сдвигают на 1" от атакующего (может упасть или перестать быть Engaged). С Blast: D6 за каждого под маркером, на X+ — 1" от центра.',
    'lance': 'У бойца с подтипом Mounted: +1 Strength на атаках как часть Charge.',
    'lance bomb': 'Первое успешное попадание за бой — профиль Primed, все следующие — Spent.',
    'light': 'Можно как Primary или Secondary в ближнем бою, но только одна атака. С Template в ближнем бою одна вражеская модель получает автоматическое попадание, шаблон не ставят.',
    'limited': 'Если оружие село, его нельзя перезарядить до конца боя.',
    'melee': 'Оружие для атак, пока модель Engaged.',
    'paired': 'Нельзя как Secondary и нельзя Secondary вместе с ним. Как Primary: носитель увеличивает Attacks на X.',
    'parry': 'Как Primary или Secondary в схватке: +1 Save. Несколько таких оружий не складываются.',
    'power pack': 'Не считается в лимите оружия бойца, но больше двух таких единиц носить нельзя.',
    'rad phage': 'Неспасённый Wound даёт Rad Poisoned: Toughness −1 (минимум 1).',
    'ram': 'Можно использовать только в активации, когда носитель выполнил Charge.',
    'rapid fire': 'Можно бросить до X кубиков огневой мощи. При попадании число попаданий равно числу пуль на кубиках. Любой символ боеприпасов — оружие садится; несколько символов — заклинивает до конца боя. Ammo (X+) считается ещё одним символом. С Light в ближнем бою кубик огневой мощи не бросают.',
    'reckless': 'Дальняя атака: цель случайна среди моделей (друг и враг) в линии видимости, в 6" от намеченной цели и в дистанции. В ближнем бою попадания случайно распределяются между всеми Engaged моделями.',
    'reliable': 'Игнорирует первый символ Out of Ammo за раунд на кубике огневой мощи.',
    'rending': 'Если натуральный бросок на ранение не меньше X, AP этой атаки увеличивается на 1.',
    'scarce': 'При Reload бросьте D6: не меньше X — перезаряжено, иначе всё ещё Out of Ammo (можно пробовать снова).',
    'shield': 'Хотя бы одно такое оружие: +1 Save против стрельбы. Несколько штук не складываются.',
    'shock': 'Если атака попадает и бросок попадания не меньше X, она автоматически ранит и считается натуральной 6 на ранении для других свойств.',
    'shred': 'Если оружие ранит и бросок на ранение не меньше X, Lethality этой атаки +1.',
    'single shot': 'Один выстрел за бой, затем сразу Out of Ammo; перезарядить нельзя.',
    'smoke': 'Можно целиться в точку на поле. Маркер Blast остаётся: столб дыма блокирует линию видимости. В End phase на 5+ остаётся, иначе снимается. Попавшая модель не ранится и не становится Suppressed.',
    'template': 'Каплевидный шаблон от стреляющего через цель: все под ним получают автоматическое попадание. С Light в ближнем бою — одно автоматическое попадание без шаблона. С Rapid Fire (X) ближайшая модель получает попадания по кубику огневой мощи, остальные — по одному.',
    'toxin': 'Против бойца ранит на X+ вместо сравнения Strength и Toughness. Против машины — только на натуральную 6.',
    'twin linked': 'При дальней атаке кубики огневой мощи можно перебросить (все сразу).',
    'unstable': 'Натуральная 1 на попадании: носитель получает автоматическое попадание этим профилем, другие модели не поражаются. Если броска попадания нет (Template) — сначала D6, как выше.',
    'unwieldy': 'В ближнем бою Initiative модели ставится в 1 до любых модификаторов.',
    'web': 'Спасброски брони нельзя (непробиваемые можно). Раненый боец не теряет Wound, а получает Webbed.',
}

_TRAIT_GLOSSARY = None
_TRAIT_RE = None


def load_trait_glossary():
    """Читает раздел WEAPON TRAITS из основных правил и вешает русский текст."""
    raw = open(CORE_RAW, encoding='utf-8').read().split('\n')
    lines = [l.rstrip() for l in raw if not re.match(r'^=== PAGE \d+ ===$', l)]
    start = 0
    for i, line in enumerate(lines):
        if line.strip() == 'WEAPON TRAITS':
            start = i

    def is_heading_name(s):
        if not s or len(s) > 48:
            return False
        letters = [c for c in s if c.isalpha()]
        return len(letters) >= 3 and all(c.isupper() for c in letters)

    glossary = {}
    name, buf = None, []

    def flush():
        if not name:
            return
        key = trait_key(name)
        text = re.sub(r'\s+', ' ', ' '.join(buf)).strip()
        if key and text:
            glossary[key] = {'en': text, 'ru': TRAIT_RU.get(key, '')}

    for line in lines[start + 1:]:
        s = line.strip()
        if not s:
            continue
        if is_heading_name(s):
            flush()
            name, buf = s, []
        elif name:
            buf.append(s)
    flush()

    for alias, canonical in TRAIT_ALIASES.items():
        if canonical in glossary:
            glossary[alias] = glossary[canonical]
    return glossary


def trait_glossary():
    global _TRAIT_GLOSSARY, _TRAIT_RE
    if _TRAIT_GLOSSARY is None:
        _TRAIT_GLOSSARY = load_trait_glossary()
        alts = []
        for key in sorted(_TRAIT_GLOSSARY, key=lambda k: -len(k)):
            parts = key.split()
            alts.append(r'(?:%s)' % r'[\s\-]+'.join(re.escape(p) for p in parts))
        _TRAIT_RE = re.compile(
            r'(?i)\b(?:' + '|'.join(alts) + r')(?:\s*\([^)]+\))?')
    return _TRAIT_GLOSSARY


def render_traits(raw):
    """Каждое известное свойство — подсказка по наведению, без JavaScript."""
    if not raw or raw.strip() in ('-', '–', '—', '*'):
        return esc(raw)
    glossary = trait_glossary()
    out = []
    pos = 0
    for match in _TRAIT_RE.finditer(raw):
        if match.start() > pos:
            out.append(esc(raw[pos:match.start()]))
        label = match.group(0).strip()
        entry = glossary.get(trait_key(label))
        if not entry:
            out.append(esc(match.group(0)))
        else:
            tip = entry['ru'] or entry['en']
            out.append(
                '<span class="trait">%s'
                '<span class="trait-tip">%s</span></span>'
                % (esc(label), esc(tip)))
        pos = match.end()
    out.append(esc(raw[pos:]))
    return ''.join(out)


# ---------------------------------------------------------------- рендер

STAT_HEAD_A = ['M', 'WS', 'BS', 'S', 'T', 'W', 'I', 'A', 'Sv', 'Ld', 'Cl', 'Wil', 'Int']
STAT_HEAD_B = STAT_HEAD_A + ['XP']


def fighter_id(prefix, name):
    """Одно и то же имя встречается в разных бандах, поэтому id с префиксом."""
    return '%s--%s' % (prefix, slug(name)) if prefix else slug(name)


def render_paragraph(text):
    return i18n.render_named_or_plain(text)


def render_weapon_rows(caption, rows):
    has_creds = any(r.get('creds') or r.get('tp') for r in rows)
    out = ['<div class="table-wrap"><table class="compact weapons">']
    if caption:
        out.append('<caption>%s</caption>' % i18n.orig_block(
            esc(i18n.translate_heading(caption)), caption))
    hdr = ('<th>Оружие<span class="orig">Weapon</span></th>'
           '<th>SR</th><th>LR</th><th>Str</th><th>AP</th>'
           '<th>L</th><th>Свойства<span class="orig">Traits</span></th>')
    if has_creds:
        hdr += ('<th>Кред.<span class="orig">Creds</span></th>'
                '<th>TP</th>')
    out.append('<thead><tr>%s</tr></thead><tbody>' % hdr)
    for r in rows:
        if r.get('group'):
            cells = ['<td class="wname group" colspan="7">%s</td>' % i18n.orig_block(
                esc(i18n.translate_heading(r['name'])), r['name'])]
            if has_creds:
                cells.append('<td>%s</td><td>%s</td>'
                             % (esc(r['creds']), esc(r['tp'])))
            out.append('<tr class="wgroup">%s</tr>' % ''.join(cells))
            continue
        sub = ' sub' if r['name'].startswith('-') else ''
        cells = ['<td class="wname%s">%s</td>' % (sub, esc(r['name'].lstrip('- ')))]
        for k in ('sr', 'lr', 'str', 'ap', 'l'):
            cells.append('<td>%s</td>' % esc(r[k]))
        cells.append('<td class="traits">%s</td>' % render_traits(r['traits']))
        if has_creds:
            cells.append('<td>%s</td>' % esc(r['creds']))
            cells.append('<td>%s</td>' % esc(r['tp']))
        out.append('<tr>%s</tr>' % ''.join(cells))
    out.append('</tbody></table></div>')
    return '\n'.join(out)


def render_profile(entry):
    """Профиль предмета, раскрываемый по клику в списке снаряжения."""
    if entry['kind'] == 'weapon':
        return render_weapon_rows(entry['caption'],
                                  [entry['row']] + entry['children'])
    if entry['kind'] == 'wargear':
        out = ['<p class="profile-price">%s</p>' % i18n.bilingual(p)
               for p in entry['prices']]
        out += [render_paragraph(p) for p in entry['body']]
        return '\n'.join(out)
    f = entry['fighter']
    out = []
    if f['type']:
        out.append('<p class="fighter-meta"><span class="fighter-type">%s</span>'
                   '</p>' % i18n.orig_block(esc(i18n.translate_type(f['type'])), f['type']))
    head = STAT_HEAD_B if f['wide'] else STAT_HEAD_A
    out.append('<div class="table-wrap"><table class="stats">')
    out.append('<thead><tr>%s</tr></thead>' % ''.join('<th>%s</th>' % h for h in head))
    out.append('<tbody>')
    for prof in f['profiles']:
        cells = prof[:14] if f['wide'] else prof[:13]
        out.append('<tr>%s</tr>' % ''.join('<td>%s</td>' % esc(c) for c in cells))
    out.append('</tbody></table></div>')
    out.append('<p><a href="#%s">Полная карточка бойца &rarr;</a></p>' % entry['anchor'])
    return '\n'.join(out)


def render_equipment(items, stores):
    out = ['<ul class="equip">']
    for it in items:
        cls = ' class="sub"' if it['sub'] else ''
        label = ('<span class="equip-name">%s</span>'
                 '<span class="equip-price">%s cr</span>'
                 % (esc(it['name']), esc(it['price'])))
        entry = lookup_item(it['name'], *stores)
        if entry:
            out.append('<li%s><details class="equip-item">'
                       '<summary>%s</summary>'
                       '<div class="equip-profile">%s</div>'
                       '</details></li>' % (cls, label, render_profile(entry)))
        else:
            out.append('<li%s><span class="equip-plain">%s</span></li>' % (cls, label))
    out.append('</ul>')
    return '\n'.join(out)


def render_fighter(f, prefix=''):
    out = ['<details class="fighter" id="%s">' % fighter_id(prefix, f['name'])]
    out.append('<summary class="fighter-head">')
    out.append('<h4 class="fighter-name">%s</h4>' % esc(f['name']))
    out.append('<span class="fighter-cost">%s кредитов'
               '<span class="orig">%s credits</span></span>'
               % (esc(f['cost']), esc(f['cost'])))
    out.append('</summary>')
    out.append('<div class="fighter-body">')
    meta = []
    if f['type']:
        meta.append('<span class="fighter-type">%s</span>' % i18n.orig_block(
            esc(i18n.translate_type(f['type'])), f['type']))
    if f['xp']:
        meta.append('<span class="fighter-xp">Стартовый XP: %s'
                    '<span class="orig">Starting XP: %s</span></span>'
                    % (esc(f['xp']), esc(f['xp'])))
    if meta:
        out.append('<p class="fighter-meta">%s</p>' % ' '.join(meta))
    if f.get('intro'):
        out.append(render_paragraph(f['intro']))

    head = STAT_HEAD_B if f['wide'] else STAT_HEAD_A
    out.append('<div class="table-wrap"><table class="stats">')
    out.append('<thead><tr>%s</tr></thead>' % ''.join('<th>%s</th>' % h for h in head))
    out.append('<tbody>')
    for prof in f['profiles']:
        cells = prof[:14] if f['wide'] else prof[:13]
        out.append('<tr>%s</tr>' % ''.join('<td>%s</td>' % esc(c) for c in cells))
    out.append('</tbody></table></div>')

    for rule in f['rules']:
        out.append(render_paragraph(rule))
    out.append('</div></details>')
    return '\n'.join(out)


def plural(n, one, few, many):
    if 11 <= abs(n) % 100 <= 14:
        return many
    tail = abs(n) % 10
    if tail == 1:
        return one
    if 2 <= tail <= 4:
        return few
    return many


def equipment_region(blocks, start):
    """Границы списка снаряжения: от заголовка до последнего блока с ценами."""
    stop = start + 1
    while stop < len(blocks):
        kind, payload = blocks[stop]
        if kind in ('weapons', 'fighter', 'skills', 'ranks', 'dice'):
            break
        if kind == 'heading' and payload['level'] <= 3:
            break
        stop += 1
    end = start
    for n in range(start + 1, stop):
        if blocks[n][0] == 'equipment':
            end = n
    return end + 1 if end > start else None


GEAR_PRICE = re.compile(r'^(\+?\d+\s*credits?|Exclusive)\b', re.I)


def count_gear_entries(blocks, start, end):
    """Профили в блоке экипировки: таблицы оружия и описания с ценой."""
    total = 0
    for i in range(start, end):
        kind, payload = blocks[i]
        if kind == 'weapons':
            total += 1
        elif kind == 'heading' and i + 1 < end:
            nxt_kind, nxt = blocks[i + 1]
            if nxt_kind == 'prose' and GEAR_PRICE.match(nxt.strip()):
                total += 1
    return total


def plan_regions(blocks):
    """Границы сворачиваемых блоков раздела, по индексу первого блока.

    Порядок в исходнике всегда один: карточки бойцов, списки снаряжения,
    профили клановой экипировки. Поэтому границы задаются первым бойцом и
    списками снаряжения, а всё после последнего списка — экипировка.
    """
    regions = {}

    equips = []
    for idx, (kind, payload) in enumerate(blocks):
        if kind == 'heading' and EQUIP_SECTION.search(payload['text']):
            end = equipment_region(blocks, idx)
            if end:
                equips.append((idx, end))

    first = next((i for i, (k, _) in enumerate(blocks) if k == 'fighter'), None)
    bound = len(blocks)
    if equips:
        bound = equips[0][0]
    elif first is not None:
        # у банды может не быть списка снаряжения — тогда бойцов закрывают
        # таблицы профилей оружия
        bound = next((i for i, (k, _) in enumerate(blocks)
                      if k == 'weapons' and i > first), len(blocks))

    if first is not None and bound > first:
        cards = sum(1 for k, _ in blocks[first:bound] if k == 'fighter')
        regions[first] = {
            'end': bound, 'cls': 'fold-fighters', 'title': 'Бойцы банды',
            'count': '%d %s' % (cards, plural(cards, 'карточка', 'карточки',
                                              'карточек'))}

    for start, end in equips:
        cnt = sum(len(p) for k, p in blocks[start + 1:end] if k == 'equipment')
        raw_title = blocks[start][1]['text']
        regions[start] = {
            'end': end, 'cls': 'fold-equip', 'drop_heading': True,
            'title_html': i18n.orig_block(esc(i18n.translate_heading(raw_title)),
                                          raw_title),
            'count': '%d %s' % (cnt, plural(cnt, 'позиция', 'позиции',
                                            'позиций'))}

    gear = equips[-1][1] if equips else bound
    if gear < len(blocks):
        cnt = count_gear_entries(blocks, gear, len(blocks))
        regions[gear] = {
            'end': len(blocks), 'cls': 'fold-gear', 'title': 'Экипировка банды',
            'count': '%d %s' % (cnt, plural(cnt, 'профиль', 'профиля',
                                            'профилей'))}
    return regions


def render_blocks(blocks, prefix='', stores=()):
    regions = plan_regions(blocks)
    out = []
    close_at = None
    for idx, (kind, payload) in enumerate(blocks):
        if close_at is not None and idx == close_at:
            out.append('</div></details>')
            close_at = None

        region = regions.get(idx)
        if region:
            title = region.get('title_html') or esc(region['title'])
            out.append('<details class="fold %s">' % region['cls'])
            out.append('<summary><span class="fold-title">%s</span>'
                       '<span class="fold-count">%s</span>'
                       '</summary><div class="fold-body">'
                       % (title, esc(region['count'])))
            close_at = region['end']
            if region.get('drop_heading'):
                continue    # заголовок списка перенесён в шапку блока

        if kind == 'heading':
            tag = 'h%d' % payload['level']
            ru = i18n.translate_heading(payload['text'])
            out.append('<%s>%s</%s>' % (
                tag, i18n.orig_block(esc(ru), payload['text']), tag))
        elif kind == 'prose':
            out.append(render_paragraph(payload))
        elif kind == 'bullets':
            out.append('<ul class="rule-list">')
            for it in payload:
                cls = ' class="sub"' if it['sub'] else ''
                out.append('<li%s>%s</li>' % (cls, i18n.bilingual(it['text'])))
            out.append('</ul>')
        elif kind == 'fighter':
            out.append(render_fighter(payload, prefix))
        elif kind == 'skills':
            out.append('<div class="table-wrap"><table class="compact skills">')
            out.append('<thead><tr><th>Боец<span class="orig">Fighter</span></th>'
                       '<th>Ловкость<span class="orig">Agility</span></th>'
                       '<th>Сила<span class="orig">Brawn</span></th>'
                       '<th>Бой<span class="orig">Combat</span></th>'
                       '<th>Хитрость<span class="orig">Cunning</span></th>'
                       '<th>Эрудит<span class="orig">Savant</span></th>'
                       '<th>Стрельба<span class="orig">Shooting</span></th>'
                       '</tr></thead><tbody>')
            for row in payload:
                cells = ['<td>%s</td>' % esc(row[0])]
                for v in row[1:]:
                    cls = 'p' if v == 'Primary' else ('s' if v == 'Secondary' else 'n')
                    ru = i18n.translate_skill_cell(v)
                    cells.append('<td class="skill %s">%s</td>'
                                 % (cls, i18n.orig_block(esc(ru), v) if v not in ('-',) else esc(v)))
                out.append('<tr>%s</tr>' % ''.join(cells))
            out.append('</tbody></table></div>')
        elif kind == 'ranks':
            out.append('<div class="table-wrap"><table class="compact">')
            out.append('<thead><tr><th>Боец<span class="orig">Fighter</span></th>'
                       '<th>Основной<span class="orig">Primary</span></th>'
                       '<th>Вторичный<span class="orig">Secondary</span></th>'
                       '</tr></thead><tbody>')
            for row in payload:
                out.append('<tr>%s</tr>' % ''.join('<td>%s</td>' % esc(c) for c in row))
            out.append('</tbody></table></div>')
        elif kind == 'weapons':
            out.append(render_weapon_rows(payload['caption'], payload['rows']))
        elif kind == 'equipment':
            out.append(render_equipment(payload, stores))
        elif kind == 'dice':
            head = payload['head']
            labels = (head if payload['wide']
                      else [head[0], ' '.join(head[1:])])
            out.append('<div class="table-wrap"><table class="compact dice-table">')
            out.append('<thead><tr>%s</tr></thead><tbody>'
                       % ''.join('<th>%s</th>' % (
                           esc(h) if re.match(r'^(D\d+|2D6)$', h)
                           else i18n.orig_block(esc(i18n.translate(h)), h)
                       ) for h in labels))
            for row in payload['rows']:
                cells = []
                for c in row[1:]:
                    if re.match(r'^[\d+\-]+$', c.strip()):
                        cells.append('<td>%s</td>' % esc(c))
                    else:
                        cells.append('<td>%s</td>' % i18n.bilingual(c))
                out.append('<tr><td class="roll">%s</td>%s</tr>'
                           % (esc(row[0]), ''.join(cells)))
            out.append('</tbody></table></div>')
    if close_at is not None:
        out.append('</div></details>')
    return '\n'.join(out)


def gang_summary(blocks, prefix=''):
    rows = [(p['name'], p['cost'], p['type']) for k, p in blocks if k == 'fighter']
    if not rows:
        return ''
    out = ['<div class="table-wrap"><table class="compact roster">',
           '<caption>Состав банды<span class="orig">Gang Composition</span></caption>',
           '<thead><tr><th>Боец<span class="orig">Fighter</span></th>'
           '<th>Тип<span class="orig">Type</span></th>'
           '<th class="num">Кредиты<span class="orig">Credits</span></th>'
           '</tr></thead><tbody>']
    for name, cost, ftype in rows:
        out.append('<tr><td><a href="#%s">%s</a></td><td>%s</td>'
                   '<td class="num">%s</td></tr>'
                   % (fighter_id(prefix, name), esc(name),
                      i18n.orig_block(esc(i18n.translate_type(ftype)), ftype),
                      esc(cost)))
    out.append('</tbody></table></div>')
    return '\n'.join(out)


# ---------------------------------------------------------------- сборка

HEAD = '''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Necromunda — правила банд</title>
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#14161c">
<link rel="stylesheet" href="styles.css">
</head>
<body>

<header class="topbar" id="top">
    <a class="backlink" href="../index.html">&larr; На главную</a>
    <h1>Necromunda</h1>
    <p>Правила банд &mdash; русский перевод, оригинал под спойлером</p>
    <p class="source">Источник: Gangs of the Underhive &amp; Outlands &bull; Правила/GANGS0_3.pdf</p>
</header>

<div class="layout">

<aside class="sidebar">
    <nav>
        <h2>Банды</h2>
'''

FOOT = '''
</main>
</div>

<footer class="page-footer">
    <p>Справочник собран из Gangs of the Underhive &amp; Outlands (Правила/GANGS0_3.pdf).
    Русский текст — для игры за столом; английский оригинал спрятан под спойлером «Оригинал» или дан короткой подписью рядом.</p>
    <p><a class="backlink" href="../index.html">&larr; На главную</a></p>
    <a class="top-link" href="#top">Наверх</a>
</footer>

<script>
// Ссылки из состава банды и из списков снаряжения ведут внутрь свёрнутых
// блоков, поэтому по якорю раскрываем всю цепочку и доводим прокрутку.
function revealHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    for (var el = target; el; el = el.parentElement) {
        if (el.tagName === 'DETAILS') el.open = true;
    }
    target.scrollIntoView();
}
window.addEventListener('hashchange', revealHash);
revealHash();
</script>

</body>
</html>
'''


def main():
    lines = load_lines()
    sections = split_gangs(lines)
    if len(sections) != len(GANGS):
        print('ВНИМАНИЕ: найдено разделов %d из %d' % (len(sections), len(GANGS)))

    core_db = build_core_db()

    parsed = []
    for title, ru, group, body in sections:
        blocks = parse_section(body)
        gang_db = build_gang_db(body, blocks, slug(title))
        parsed.append((title, ru, group, blocks, gang_db))

    # ---- боковое меню
    nav = []
    for key, ru_group, en_group in GROUPS:
        items = [(t, ru) for t, ru, g, _b, _d in parsed if g == key]
        if not items:
            continue
        nav.append('        <details open>')
        nav.append('            <summary>%s</summary>' % ru_group)
        nav.append('            <ul>')
        for title, ru in items:
            en = title.replace(' GANG LIST', '').replace(' CULT LIST', ' Cult') \
                      .replace(' PATROL LIST', '').replace(' PARTY LIST', '').title()
            nav.append('                <li><a href="#%s">%s<span class="en">%s</span></a></li>'
                       % (slug(title), ru, esc(en)))
        nav.append('            </ul>')
        nav.append('        </details>')
    nav.append('    </nav>\n</aside>\n\n<main class="content">')

    body_html = []
    for title, ru, group, blocks, gang_db in parsed:
        en = title.title()
        gid = slug(title)
        body_html.append('<section id="%s">' % gid)
        body_html.append('<h2>%s<span class="en">%s</span></h2>' % (esc(ru), esc(en)))
        body_html.append(gang_summary(blocks, gid))
        body_html.append(render_blocks(blocks, gid, (gang_db, core_db)))
        body_html.append('<a class="top-link" href="#top">Наверх</a>')
        body_html.append('</section>')

    doc = HEAD + '\n'.join(nav) + '\n' + '\n'.join(body_html) + FOOT
    open(OUT, 'w', encoding='utf-8').write(doc)

    fighters = sum(1 for _, _, _, b, _ in parsed for k, _ in b if k == 'fighter')
    weapons = sum(1 for _, _, _, b, _ in parsed for k, _ in b if k == 'weapons')
    print('свойств оружия в словаре: %d' % len(trait_glossary()))

    matched, missing = 0, []
    for _, _, _, blocks, gang_db in parsed:
        for kind, payload in blocks:
            if kind != 'equipment':
                continue
            for it in payload:
                if lookup_item(it['name'], gang_db, core_db):
                    matched += 1
                else:
                    missing.append(it['name'])

    print('разделов: %d' % len(parsed))
    print('карточек бойцов: %d' % fighters)
    print('таблиц оружия: %d' % weapons)
    print('профилей в базе: %d основных + %d по бандам'
          % (len(core_db), sum(len(d) for *_, d in parsed)))
    print('позиций снаряжения: %d, с профилем %d (%.1f%%)'
          % (matched + len(missing), matched,
             100.0 * matched / max(1, matched + len(missing))))
    if missing:
        uniq = sorted(set(missing))
        print('без профиля (%d уникальных):' % len(uniq))
        for name in uniq[:60]:
            print('   ', name)
    print('размер: %.1f КБ' % (len(doc) / 1024))


if __name__ == '__main__':
    main()
