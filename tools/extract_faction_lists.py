# -*- coding: utf-8 -*-
"""Собирает data/factions/<id>.json из карточек бойцов и списков снаряжения в pages/gangs/."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GANGS_DIR = ROOT / 'pages' / 'gangs'
OUT = ROOT / 'data' / 'factions'

SECTION_RE = re.compile(
    r'<section id="([^"]+)">\s*<h2>(.*?)<span class="en">.*?</span></h2>(.*?)</section>',
    re.S,
)
FIGHTER_RE = re.compile(
    r'<details class="fighter" id="([^"]+)">\s*'
    r'<summary class="fighter-head">\s*'
    r'<h4 class="fighter-name">([^<]+)</h4>\s*'
    r'<span class="fighter-cost">(\d+)\s+'
    r'.*?<span class="fighter-type">[^<]*<span class="orig">((?:Fighter|Vehicle|Crew)(?: \([^<]+\))?)</span>'
    r'.*?<span class="fighter-xp">[^<]*<span class="orig">Starting XP: (\d+)</span>',
    re.S,
)
KIND_RE = re.compile(r'^(Fighter|Vehicle|Crew)(?: \((.+)\))?$')
EQUIP_SPLIT_RE = re.compile(r'<details class="fold fold-equip">')
LIST_NAME_RE = re.compile(r'<span class="fold-title">[^<]*<span class="orig">([^<]+)</span>')
H4_ORIG_RE = re.compile(r'<h4>[^<]*<span class="orig">([^<]+)</span></h4>')
ITEM_RE = re.compile(
    r'<span class="equip-name">(.*?)</span><span class="equip-price">(\+?)(\d+)\s*cr</span>',
    re.S,
)
SUB_ROW_RE = re.compile(
    r'<td class="wname sub">([^<]+)</td>'
    r'(?:<td>[^<]*</td>){5}'
    r'<td class="traits">.*?</td>'
    r'<td>\+(\d+)</td>',
    re.S,
)
WARP_WEAPONS = {'Autogun', 'Autopistol', 'Stub gun'}
STATS_RE = re.compile(
    r'<table class="stats">\s*<thead><tr>(.*?)</tr></thead>\s*<tbody>\s*<tr>(.*?)</tr>',
    re.S,
)
CELL_RE = re.compile(r'<t[hd][^>]*>(.*?)</t[hd]>', re.S)
TRAIT_RE = re.compile(
    r'<span class="trait">([^<]+)(?:<span class="trait-tip">(.*?)</span>)?</span>',
    re.S,
)
WEAPON_ROW_RE = re.compile(
    r'<tr><td class="wname(?: sub)?">([^<]+)</td>'
    r'<td>([^<]*)</td><td>([^<]*)</td><td>([^<]*)</td><td>([^<]*)</td><td>([^<]*)</td>'
    r'<td class="traits">(.*?)</td>',
    re.S,
)
TERM_RE = re.compile(
    r'<p><span class="term">([^<]*)<span class="orig">([^<]+)</span></span>\s*(.*?)</p>',
    re.S,
)
SPOILER_RE = re.compile(r'<details class="orig-spoiler">.*?</details>', re.S)
GANG_RULES_RE = re.compile(
    r'<h3>[^<]*<span class="orig">GANG SPECIAL RULES</span></h3>(.*)',
    re.S,
)
TERM_PARA_RE = re.compile(
    r'<span class="term">([^<]*)<span class="orig">([^<]+)</span></span>\s*(.*)',
    re.S,
)
BENEFITS_RE = re.compile(r'benefits from the ([A-Za-z][A-Za-z \'-]*?) rule', re.I)
WARP_TRAITS = [
    {
        'name': 'Cursed',
        'text': 'Попавшая модель проходит Willpower или получает Insanity. Натуральная 1 на попадании: то же для носителя.',
    },
    {
        'name': 'Single Shot',
        'text': 'Один выстрел за бой, затем сразу Out of Ammo; перезарядить нельзя.',
    },
]
LIGHT_TRAIT = {
    'name': 'Light',
    'text': 'Можно как Primary или Secondary в ближнем бою, но только одна атака. С Template в ближнем бою одна вражеская модель получает автоматическое попадание, шаблон не ставят.',
}
WARP_PROFILES = {
    'Autogun': {'name': 'warp rounds', 'sr': '8”', 'lr': '24”', 'str': '3', 'ap': '-', 'l': '1', 'traits': WARP_TRAITS},
    'Autopistol': {
        'name': 'warp rounds', 'sr': '4”', 'lr': '12”', 'str': '3', 'ap': '-', 'l': '1',
        'traits': [WARP_TRAITS[0], LIGHT_TRAIT, WARP_TRAITS[1]],
    },
    'Stub gun': {
        'name': 'warp rounds', 'sr': '6”', 'lr': '12”', 'str': '3', 'ap': '-', 'l': '1',
        'traits': [WARP_TRAITS[0], LIGHT_TRAIT, WARP_TRAITS[1]],
    },
}

SUFFIXES = ('-gang-list', '-patrol-list', '-party-list', '-list')
NO_SLOT = (
    'ARMOUR', 'WARGEAR', 'GRENADE', 'PERSONAL EQUIPMENT', 'STATUS',
    'PET', 'MOUNT', 'EXOTIC', 'CHEM', 'BIONIC', 'BOMB', 'GANG TERRAIN',
)


def faction_id(section_id: str) -> str:
    for suffix in SUFFIXES:
        if section_id.endswith(suffix):
            return section_id[: -len(suffix)]
    return section_id


def title_name(raw: str) -> str:
    words = []
    for word in raw.replace('\u2018', "'").replace('\u2019', "'").split():
        quoted = word.startswith("'") and word.endswith("'") and len(word) > 1
        core = word[1:-1] if quoted else word
        titled = '-'.join(part.capitalize() for part in core.split('-'))
        words.append("'%s'" % titled if quoted else titled)
    return ' '.join(words)


def parse_kind(orig: str) -> tuple[str, list[str]]:
    match = KIND_RE.match(orig.strip())
    if not match:
        return 'Fighter', []
    inside = match.group(2) or ''
    subtypes = [item.strip() for item in inside.split(',') if item.strip()]
    return match.group(1), subtypes


def gear_slots(name: str, category: str) -> int:
    if '*' in name:
        return 2
    upper = category.upper()
    if any(token in upper for token in NO_SLOT):
        return 0
    return 1


def clean_name(raw: str) -> str:
    return re.sub(r'\s+', ' ', html.unescape(raw)).strip()


def upgrade_name(raw: str) -> str:
    name = clean_name(raw)
    if name.lower() in {'warp round', 'warp rounds'}:
        return 'warp rounds'
    return name


def add_upgrade(item: dict, name: str, cost: int) -> None:
    if cost <= 0 or not name or '<' in name:
        return
    upgrades = item.setdefault('upgrades', [])
    if any(entry['name'] == name for entry in upgrades):
        return
    upgrades.append({'name': name, 'cost': cost})


def strip_tags(raw: str) -> str:
    text = re.sub(r'<span class="orig">.*?</span>', '', raw, flags=re.S)
    text = re.sub(r'<details class="orig-spoiler">.*?</details>', '', text, flags=re.S)
    text = re.sub(r'<[^>]+>', '', text)
    return html.unescape(re.sub(r'\s+', ' ', text)).strip()


def parse_stats(chunk: str) -> dict | None:
    match = STATS_RE.search(chunk)
    if not match:
        return None
    keys = [strip_tags(cell) for cell in CELL_RE.findall(match.group(1))]
    values = [strip_tags(cell) for cell in CELL_RE.findall(match.group(2))]
    if not keys or len(keys) != len(values):
        return None
    return {'keys': keys, 'values': values}


def without_spoilers(raw: str) -> str:
    return SPOILER_RE.sub('', raw)


def rule_text(title: str, body: str) -> str:
    body = re.split(r'Оригинал', body, maxsplit=1)[0].strip()
    return f'{title}: {body}' if body else title


def parse_fighter_rules(chunk: str) -> list[str]:
    rules: list[str] = []
    for match in TERM_RE.finditer(without_spoilers(chunk)):
        orig = match.group(2).strip()
        if orig.lower().startswith('equipment'):
            continue
        title = html.unescape(match.group(1)).strip().rstrip(':') or orig
        rules.append(rule_text(title, strip_tags(match.group(3))))
    return rules


def parse_gang_named_rules(body: str) -> dict[str, str]:
    match = GANG_RULES_RE.search(body)
    if not match:
        return {}
    region = without_spoilers(match.group(1).split('<details class="fold fold-fighters">', 1)[0])
    abilities: dict[str, str] = {}
    current_key = ''
    current_title = ''
    parts: list[str] = []

    def flush() -> None:
        nonlocal current_key, current_title, parts
        if current_key and parts:
            abilities[current_key] = rule_text(current_title, ' '.join(parts).rstrip(':'))
        current_key = ''
        current_title = ''
        parts = []

    for para in re.findall(r'<p>(.*?)</p>', region, flags=re.S):
        term = TERM_PARA_RE.match(para)
        if term:
            flush()
            orig = term.group(2).strip()
            current_title = html.unescape(term.group(1)).strip().rstrip(':') or orig
            current_key = orig.lower()
            text = strip_tags(term.group(3))
            if text:
                parts.append(text)
        elif current_key:
            extra = strip_tags(para)
            if extra:
                parts.append(extra)
    flush()
    return abilities


def expand_referenced_rules(rules: list[str], chunk: str, abilities: dict[str, str]) -> list[str]:
    expanded = list(rules)
    known = {item.casefold() for item in expanded}
    for match in BENEFITS_RE.finditer(chunk):
        text = abilities.get(match.group(1).strip().lower())
        if text and text.casefold() not in known:
            expanded.append(text)
            known.add(text.casefold())
    return expanded


def parse_weapon_profiles(chunk: str) -> list[dict]:
    profiles: list[dict] = []
    for match in WEAPON_ROW_RE.finditer(chunk):
        traits = []
        for trait in TRAIT_RE.finditer(match.group(7)):
            entry = {'name': html.unescape(trait.group(1)).strip()}
            tip = strip_tags(trait.group(2) or '')
            if tip:
                entry['text'] = tip
            traits.append(entry)
        profiles.append({
            'name': upgrade_name(match.group(1)),
            'sr': html.unescape(match.group(2)).strip(),
            'lr': html.unescape(match.group(3)).strip(),
            'str': html.unescape(match.group(4)).strip(),
            'ap': html.unescape(match.group(5)).strip(),
            'l': html.unescape(match.group(6)).strip(),
            'traits': traits,
        })
    return profiles


def norm_weapon_name(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', html.unescape(value).lower())


ARMED_WITH_RE = re.compile(
    r'(?:is armed with|is army with)\s+(.+?)(?:\.|$)',
    re.I,
)


def split_armed_names(blob: str) -> list[str]:
    text = html.unescape(blob)
    text = re.sub(r'\([^)]*\)', ' ', text)
    text = re.sub(r'\b(?:a|an|the)\b', ' ', text, flags=re.I)
    text = re.sub(r'\s+', ' ', text).strip()
    parts = re.split(r'\s*(?:,|;| and | & |\+)\s*', text, flags=re.I)
    names = []
    for part in parts:
        name = part.strip(' .')
        if len(name) < 3:
            continue
        if re.match(r'^(they|it|when|this|which)\b', name, re.I):
            continue
        names.append(name)
    return names


def index_weapon_profiles(body: str, equipment: list[dict]) -> dict[str, dict]:
    by_name: dict[str, dict] = {}
    for profile in parse_weapon_profiles(body):
        key = norm_weapon_name(profile['name'])
        if key:
            by_name[key] = profile
    for item in equipment:
        item_key = norm_weapon_name(item['name'])
        for profile in item.get('profiles') or []:
            key = norm_weapon_name(profile['name'])
            if key:
                by_name.setdefault(key, profile)
            if item_key:
                by_name.setdefault(item_key, profile)
    return by_name


def lookup_innate_profile(name: str, catalog: dict[str, dict]) -> dict | None:
    key = norm_weapon_name(name)
    if not key:
        return None
    if key in catalog:
        return catalog[key]
    for stored, profile in catalog.items():
        if len(key) >= 6 and (key in stored or stored in key):
            return profile
    return None


def innate_weapons(chunk: str, catalog: dict[str, dict]) -> list[dict]:
    names: list[str] = []
    for match in ARMED_WITH_RE.finditer(chunk):
        names.extend(split_armed_names(match.group(1)))
    if re.search(r'benefits from the Extra Arm rule', chunk, re.I):
        names.append('clawed arm')
    found: list[dict] = []
    seen: set[tuple] = set()
    for profile in parse_weapon_profiles(chunk):
        mark = (profile['name'], profile['sr'], profile['str'], profile['l'])
        if mark not in seen:
            seen.add(mark)
            found.append(profile)
    for name in names:
        profile = lookup_innate_profile(name, catalog)
        if not profile:
            continue
        mark = (profile['name'], profile['sr'], profile['str'], profile['l'])
        if mark in seen:
            continue
        seen.add(mark)
        found.append(profile)
    return found


def parse_gear_description(chunk: str) -> str:
    text = re.sub(r'<div class="table-wrap">.*?</div>', '', chunk, flags=re.S)
    text = re.sub(r'<p class="profile-price">.*?</p>', '', text, flags=re.S)
    text = re.sub(r'<p class="fighter-meta">.*?</p>', '', text, flags=re.S)
    text = re.sub(r'<p><a\b.*?</p>', '', text, flags=re.S)
    text = re.sub(r'<details class="orig-spoiler">.*?</details>', '', text, flags=re.S)
    text = re.sub(r'<span class="orig">.*?</span>', '', text, flags=re.S)
    parts = []
    for para in re.findall(r'<p\b[^>]*>(.*?)</p>', text, flags=re.S):
        cleaned = strip_tags(para)
        if cleaned and not cleaned.startswith('Полная карточка'):
            parts.append(cleaned)
    return ' '.join(parts)


def profile_belongs(item_name: str, profile_name: str) -> bool:
    if upgrade_name(profile_name) == 'warp rounds':
        return True
    item = re.sub(r'[*()]', '', item_name.lower())
    prof = re.sub(r'[*()]', '', profile_name.lower())
    if '/' not in item and ' with ' not in item:
        return True
    if prof in item:
        return True
    words = [word for word in re.split(r'[^a-z0-9]+', prof) if len(word) > 2]
    return bool(words) and all(word in item for word in words)


def has_named_profile(item: dict, name: str) -> bool:
    needle = upgrade_name(name).lower()
    return any(upgrade_name(profile['name']).lower() == needle for profile in item.get('profiles', []))


def attach_profiles(item: dict, chunk: str) -> None:
    profiles = [profile for profile in parse_weapon_profiles(chunk) if profile_belongs(item['name'], profile['name'])]
    if profiles:
        existing = {(p['name'], p['sr'], p['lr'], p['str']) for p in item.get('profiles', [])}
        merged = item.setdefault('profiles', [])
        for profile in profiles:
            key = (profile['name'], profile['sr'], profile['lr'], profile['str'])
            if key not in existing:
                merged.append(profile)
                existing.add(key)
    description = parse_gear_description(chunk)
    if description and not item.get('description'):
        item['description'] = description


def ensure_warp_rounds(item: dict) -> None:
    base = item['name'].rstrip('*').strip()
    if base not in WARP_WEAPONS:
        return
    add_upgrade(item, 'warp rounds', 10)
    if has_named_profile(item, 'warp rounds'):
        return
    fallback = WARP_PROFILES.get(base)
    if fallback:
        item.setdefault('profiles', []).append({
            **fallback,
            'traits': [dict(trait) for trait in fallback['traits']],
        })


def parse_equipment(body: str) -> list[dict]:
    items: list[dict] = []
    by_key: dict[tuple[str, int], dict] = {}
    for raw in EQUIP_SPLIT_RE.split(body)[1:]:
        last_item: dict | None = None
        cut = re.search(r'<details class="fold ', raw)
        fold = raw[: cut.start()] if cut else raw
        list_match = LIST_NAME_RE.search(fold)
        list_name = html.unescape(list_match.group(1)).replace(' EQUIPMENT LIST', '') if list_match else ''
        category = ''
        item_matches = list(ITEM_RE.finditer(fold))
        markers = [(m.start(), 'cat', html.unescape(m.group(1))) for m in H4_ORIG_RE.finditer(fold)]
        markers += [(m.start(), 'item', m) for m in item_matches]
        markers.sort(key=lambda row: row[0])
        for marker in markers:
            if marker[1] == 'cat':
                category = marker[2]
                continue
            match = marker[2]
            name = clean_name(match.group(1))
            plus = bool(match.group(2))
            cost = int(match.group(3))
            if not name or '<' in name:
                continue
            if plus:
                li_start = fold.rfind('<li', 0, match.start())
                nested = li_start != -1 and fold[li_start:li_start + 16].startswith('<li class="sub"')
                if nested:
                    if last_item:
                        add_upgrade(last_item, upgrade_name(name), cost)
                    continue
            next_item = next((other for other in item_matches if other.start() > match.start()), None)
            chunk = fold[match.end(): next_item.start() if next_item else len(fold)]
            upgrades = [
                (upgrade_name(raw_name), int(raw_cost))
                for raw_name, raw_cost in SUB_ROW_RE.findall(chunk)
            ]
            key = (name, cost)
            existing = by_key.get(key)
            if existing:
                for upgrade, upgrade_cost in upgrades:
                    add_upgrade(existing, upgrade, upgrade_cost)
                attach_profiles(existing, chunk)
                ensure_warp_rounds(existing)
                last_item = existing
                continue
            item = {
                'name': name,
                'cost': cost,
                'slots': gear_slots(name, category),
                'category': category,
                'list': list_name,
            }
            for upgrade, upgrade_cost in upgrades:
                add_upgrade(item, upgrade, upgrade_cost)
            attach_profiles(item, chunk)
            ensure_warp_rounds(item)
            by_key[key] = item
            last_item = item
            items.append(item)
    return items


def load_gang_pages() -> str:
    files = sorted(GANGS_DIR.glob('*.html'))
    if not files:
        raise SystemExit('нет pages/gangs/*.html — сначала python tools/build_gangs.py')
    return '\n'.join(path.read_text(encoding='utf-8') for path in files)


def main() -> None:
    html_text = load_gang_pages()
    OUT.mkdir(parents=True, exist_ok=True)
    index = []
    for section_id, heading, body in SECTION_RE.findall(html_text):
        fid = faction_id(section_id)
        name = re.sub(r'\s+', ' ', heading).strip()
        equipment = parse_equipment(body)
        weapon_catalog = index_weapon_profiles(body, equipment)
        gang_rules = parse_gang_named_rules(body)
        types = []
        subtype_set: list[str] = []
        seen = set()
        fighter_matches = list(FIGHTER_RE.finditer(body))
        for fighter_index, match in enumerate(fighter_matches):
            fighter_id, raw_name, cost, kind_orig, xp = match.groups()
            local_id = fighter_id.rsplit('--', 1)[-1]
            category, subtypes = parse_kind(kind_orig)
            chunk_end = (
                fighter_matches[fighter_index + 1].start()
                if fighter_index + 1 < len(fighter_matches)
                else len(body)
            )
            region = body[match.end():chunk_end]
            fold_at = re.search(r'<details class="fold', region)
            chunk = region[: fold_at.start()] if fold_at else region
            item = {
                'id': local_id,
                'name': title_name(raw_name),
                'category': category,
                'subtypes': subtypes,
                'baseCost': int(cost),
                'xp': int(xp),
            }
            stats = parse_stats(chunk)
            if stats:
                item['stats'] = stats
            rules = expand_referenced_rules(parse_fighter_rules(chunk), chunk, gang_rules)
            if rules:
                item['rules'] = rules
            weapons = innate_weapons(chunk, weapon_catalog)
            if weapons:
                item['weapons'] = weapons
            types.append(item)
            for subtype in subtypes:
                if subtype not in seen:
                    seen.add(subtype)
                    subtype_set.append(subtype)
        armed = sum(1 for item in types if item.get('weapons'))
        payload = {
            'id': fid,
            'name': name,
            'types': types,
            'subtypes': sorted(subtype_set),
            'equipment': equipment,
        }
        dest = OUT / f'{fid}.json'
        dest.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        index.append({
            'id': fid,
            'name': name,
            'file': dest.name,
            'types': len(types),
            'equipment': len(equipment),
        })
        print(f'{fid:28} {len(types):2} types  {armed:2} armed  {len(equipment):3} gear  {name}')
    (OUT / 'index.json').write_text(
        json.dumps({'factions': index}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
