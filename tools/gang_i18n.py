# -*- coding: utf-8 -*-
"""Русский текст правил банд + оригинал (короткий сразу, длинный под спойлером)."""
import html
import re
import unicodedata

ORIG_WORD_LIMIT = 15


def esc(text):
    return html.escape(text, quote=False)


def norm_key(text):
    s = unicodedata.normalize('NFKC', text or '')
    s = s.replace('\u2019', "'").replace('\u2018', "'").replace('\u201b', "'")
    s = s.replace('\u201c', '"').replace('\u201d', '"')
    s = s.replace('\u2013', '-').replace('\u2014', '-')
    s = s.replace('\u00a0', ' ').replace('\u2022', '-')
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def mark_inline_terms(ru_html):
    """Подсветка названий уникальных действий внутри уже экранированного русского текста."""
    if not ru_html or 'Исчезновение' not in ru_html:
        return ru_html
    return re.sub(
        r'(?<!class="term">)Исчезновение',
        '<span class="term">Исчезновение</span>',
        ru_html,
    )


def orig_block(ru_html, en_text):
    """Русский HTML + оригинал: до 15 слов сразу, иначе спойлер.

    ru_html уже размечен/экранирован. en_text — сырой английский.
    """
    en_text = (en_text or '').strip()
    ru_html = mark_inline_terms(ru_html or '')
    if not en_text:
        return ru_html
    plain = re.sub(r'<[^>]+>', '', ru_html)
    plain = html.unescape(re.sub(r'\s+', ' ', plain)).strip()
    if norm_key(plain) == norm_key(en_text):
        return ru_html
    en_html = esc(en_text)
    if len(en_text.split()) <= ORIG_WORD_LIMIT:
        return '%s<span class="orig">%s</span>' % (ru_html, en_html)
    return (
        '%s<details class="orig-spoiler"><summary>Оригинал</summary>'
        '<p class="orig-full">%s</p></details>' % (ru_html, en_html)
    )


def bilingual(en_text):
    """Перевод абзаца/пункта с оригиналом под ним."""
    en_text = en_text or ''
    ru = translate(en_text)
    return orig_block(esc(ru), en_text)


# ---------------------------------------------------------------------------
# заголовки разделов и подписи таблиц оружия
# ---------------------------------------------------------------------------

HEADINGS = {
    'AFFILIATION': 'Принадлежность',
    'A House Divided': 'Разделённый дом',
    'Medic Equipment': 'Снаряжение медика',
    'Ambush Predator': 'Хищник из засады',
    'ARANTHIAN EQUIPMENT LIST': 'Список снаряжения арантианцев',
    'ARANTHIAN OUTCAST GANGS': 'Арантианские банды изгоев',
    'ARANTHIAN WEAPONS': 'Арантианское оружие',
    'ARCHETYPE': 'Архетип',
    'ARMOUR & FIELD ARMOUR': 'Броня и силовые поля',
    'ASH WASTE NOMAD EQUIPMENT LIST': 'Список снаряжения кочевников Пепельных пустошей',
    'AUGMETIC WEAPONS': 'Аугметическое оружие',
    'AUGURSPEX': 'Augurspex',
    'AUTO-CHEM': 'Auto-chem',
    'AUTO/STUB WEAPONS': 'Авто / стаб-оружие',
    'AUXILIARY WEAPONS': 'Вспомогательное оружие',
    'BASE OF OPERATIONS': 'База операций',
    'BLADES OF THE MATRIARCH EQUIPMENT LIST': 'Список снаряжения Клинков Матриарха',
    'BLAST WEAPONS': 'Blast-оружие',
    'BOLT WEAPONS': 'Болт-оружие',
    'BOMB DELIVERY RATS': 'Bomb Delivery Rats',
    'BOOK OF THE REDEMPTION': 'Книга Искупления',
    'BRAWLER': 'Боец ближнего боя',
    'CAWDOR POLEARMS': 'Каудорские древковые',
    'CHAIN WEAPONS': 'Цепное оружие',
    'CHAOS CORRUPTED GANGS': 'Банды, порченные Хаосом',
    'CHAOS CORRUPTED GANGS SPECIAL RULES': 'Особые правила банд, порченных Хаосом',
    'CHAOS HELOT EQUIPMENT LIST': 'Список снаряжения хаоситских илотов',
    'CHAOS HELOT WYRD POWERS': 'Силы виардов хаоситских илотов',
    'CHAOS RITUALS': 'Ритуалы Хаоса',
    'CHEM SLUGGER': 'Chem slugger',
    'CLAN HOUSE OUTCAST GANGS': 'Изгои домов-кланов',
    'CLANLESS OUTCAST GANGS': 'Бездомные изгои',
    'CLAWS': 'Когти',
    'CLOSE COMBAT WEAPONS': 'Оружие ближнего боя',
    'COMBI-PISTOLS': 'Комби-пистолеты',
    'COMBI-WEAPONS': 'Комби-оружие',
    'CONDUIT OF OZOSTIUM': 'Conduit of Ozostium',
    'CORPSE GRINDER CULT EQUIPMENT LIST': 'Список снаряжения культа Трупорезов',
    'CORPSE GRINDER CULT ICON': 'Символ культа Трупорезов',
    'CULT ICON': 'Культовый символ',
    'DEADLY BLOWS (FIGHTER ONLY)': 'Смертельные удары (только боец)',
    "DESIGNER'S NOTE: ELEVATING A FIGHTER TO LEADER STATUS": 'Заметка автора: повышение бойца до лидера',
    'DUSTBACK HELAMITE': 'Dustback Helamite',
    'EFFECTS OF CHAOS CORRUPTION': 'Эффекты порчи Хаоса',
    'EFFECTS OF GENESTEALER CULT CORRUPTION': 'Эффекты порчи культа генокрадов',
    'EFFECTS OF MALSTRAIN CORRUPTION': 'Эффекты порчи Мальстрейна',
    'EMBRACING THE CHAOS GODS': 'Принятие богов Хаоса',
    "ENFORCER ‘SANCTIONER’ PATTERN AUTOMATA 235 CREDITS": "Автомата энфорсеров «Sanctioner», 235 кредитов",
    'ESCHER CUTTER': 'Escher Cutter',
    'ESOTERIC WEAPONS': 'Эзотерическое оружие',
    'EXO WEAPONS': 'Экзо-оружие',
    'EXO-SUIT': 'Экзокостюм',
    'EXTRA APPENDAGE': 'Лишняя конечность',
    'FINESSE SKILLS': 'Навыки Finesse',
    'FLAMERS': 'Огнемёты',
    'FORGE SMELTERS EQUIPMENT LIST': 'Список снаряжения Плавильщиков кузниц',
    'FREE OGRYN EQUIPMENT LIST': 'Список снаряжения свободных огринов',
    'GANG LEGACY': 'Наследие банды',
    'GANG SPECIAL RULES': 'Особые правила банды',
    'GENESTEALER CULT CORRUPTED GANGS': 'Банды, порченные культом генокрадов',
    'GENESTEALER CULT CORRUPTED GANGS SPECIAL RULES': 'Особые правила банд, порченных культом генокрадов',
    'GENESTEALER CULT EQUIPMENT LIST': 'Список снаряжения культа генокрадов',
    'GENESTEALER CULT WYRD POWERS': 'Силы виардов культа генокрадов',
    'GENESTEALER INFESTATION': 'Заражение генокрадами',
    'GLOVES OF OZOSTIUM': 'Gloves of Ozostium',
    'GOLIATH MAULER': 'Goliath Mauler',
    "GOLIATH ‘ZERKER 175 CREDITS": "Голиаф-‘Zerker, 175 кредитов",
    'GRAV CUTTER': 'Grav cutter',
    'GRAV WEAPONS': 'Грав-оружие',
    'GRENADE LAUNCHERS': 'Гранатомёты',
    'GRENADES': 'Гранаты',
    'GUNSLINGER': 'Стрелок',
    'HORRIFIC APPEARANCE': 'Ужасающая внешность',
    'HOUSE CAWDOR EQUIPMENT LIST': 'Список снаряжения дома Каудор',
    'HOUSE DELAQUE EQUIPMENT LIST': 'Список снаряжения дома Делак',
    'HOUSE ESCHER EQUIPMENT LIST': 'Список снаряжения дома Эшер',
    'HOUSE GOLIATH EQUIPMENT LIST': 'Список снаряжения дома Голиаф',
    'HOUSE ORLOCK EQUIPMENT LIST': 'Список снаряжения дома Орлок',
    'HOUSE VAN SAAR EQUIPMENT LIST': 'Список снаряжения дома Ван Саар',
    'HUNT MASTER WEAPONS': 'Оружие Hunt Master',
    'IMMOVABLE OBJECT (FIGHTER ONLY)': 'Неподвижный объект (только боец)',
    'INCOME, EQUIPMENT & RECRUITMENT': 'Доход, снаряжение и набор',
    'IRONHEAD SQUAT EQUIPMENT LIST': 'Список снаряжения сквотов Айронхед',
    'JAKARA HUNTING RIG': 'Охотничий риг Jakara',
    'JAKARA WEAPONS': 'Оружие Jakara',
    'JUMP BOOSTER': 'Jump booster',
    'LANCES': 'Пики',
    'LAS WEAPONS': 'Лаз-оружие',
    'LEAD RITUAL (LEADER ONLY': 'Вести ритуал (только лидер)',
    'LIGHTNING REFLEXES': 'Молниеносные рефлексы',
    'MAGNACLES': 'Magnacles',
    'MALCADON HUNTING RIG': 'Охотничий риг Malcadon',
    'MALCADON SLASHING CLAW & PAIRED MALCADON SLASHING': 'Malcadon slashing claw и парные',
    'MALCADON TOXIN WHIP & PAIRED MALCADON TOXIN WHIPS': 'Malcadon toxin whip и парные',
    'MALCADON WEAPONS': 'Оружие Malcadon',
    'MALSTRAIN CORRUPTED GANGS': 'Банды, порченные Мальстрейном',
    'MALSTRAIN CORRUPTED SPECIAL RULES': 'Особые правила порчи Мальстрейна',
    'MALSTRAIN EQUIPMENT LIST': 'Список снаряжения Мальстрейна',
    'MALSTRAIN WYRD POWERS': 'Силы виардов Мальстрейна',
    'MASSIVE CLAWS': 'Массивные когти',
    'MASTERMIND': 'Вдохновитель',
    'MELTA WEAPONS': 'Мельта-оружие',
    'MIRROR SHIELD': 'Зеркальный щит',
    'MONOMOLECULAR SWORD': 'Мономолекулярный меч',
    'MOUNTS': 'Скакуны',
    'MULTI-HARNESS': 'Мульти-упряжь',
    'MUSCLE SKILLS': 'Навыки Muscle',
    'MUTANT OUTCAST GANGS': 'Мутантские банды изгоев',
    'MUTATIONS': 'Мутации',
    'NAGA BLADE': 'Naga blade',
    'NEEDLE SPINES': 'Игольчатые шипы',
    'NEW SUBTYPE: BEASTMAN': 'Новый подтип: зверолюд',
    'NEW SUBTYPE: OGRYN': 'Новый подтип: огрин',
    'NEW SUBTYPE: RATLING': 'Новый подтип: ратлинг',
    'NEW SUBTYPE: SPYRER': 'Новый подтип: шпайрер',
    'NOMAD WEAPONS': 'Оружие кочевников',
    'ORRUS CLOSE COMBAT': 'Ближний бой Orrus',
    'ORRUS CLOSE COMBAT WEAPONS': 'Оружие ближнего боя Orrus',
    'ORRUS HUNTING RIG': 'Охотничий риг Orrus',
    'ORRUS POWER FISTS': 'Силовые кулаки Orrus',
    'ORRUS POWER TALONS': 'Силовые когти Orrus',
    'ORRUS RANGED WEAPONS': 'Дальнобойное оружие Orrus',
    'OUTCAST EQUIPMENT LIST': 'Список снаряжения изгоев',
    'OUTRIDER QUAD': 'Outrider Quad',
    'PAIRED BOLT LAUNCHERS': 'Парные bolt launcher',
    'PAIRED DISINTEGRATION MATRIX': 'Парная disintegration matrix',
    'PAIRED VOLKITE DISCHARGER': 'Парный volkite discharger',
    'PALANITE ENFORCE PATROL EQUIPMENT LIST': 'Список снаряжения паланитского патруля',
    'PERSONAL EQUIPMENT': 'Личное снаряжение',
    'PETS': 'Питомцы',
    'PLASMA WEAPONS': 'Плазма-оружие',
    'POWER PACK': 'Энергоблок',
    'POWER WEAPONS': 'Силовое оружие',
    'PRIMITIVE WEAPONS': 'Примитивное оружие',
    'PSYCHOMANCER’S HARNESS': 'Упряжь психомансера',
    'PSYCHOTERIC WHISPERS': 'Психотерические шёпоты',
    'PYROMANTIC MANTLE': 'Пиромантическая мантия',
    'RADIATION WEAPONS': 'Радиационное оружие',
    'RANGED WEAPONS': 'Дальнобойное оружие',
    'REDEMPTIONIST EQUIPMENT LIST': 'Список снаряжения искупителей',
    'REFRACTION CLOAK': 'Рефракционный плащ',
    'REPURPOSED TOOLS': 'Переделанный инструмент',
    'RIDGE WALKER': 'Ridge Walker',
    'RITUAL FOCUS (MAX ONE FIGHTER)': 'Фокус ритуала (не больше одного бойца)',
    'SERVO-MEDICAE': 'Servo-medicae',
    'SEVEN-POINTED BREASTPLATE': 'Семиконечный нагрудник',
    'SEVEN-POINTED TALISMAN': 'Семиконечный талисман',
    'SHIELDS': 'Щиты',
    'SHOCK WEAPONS': 'Шоковое оружие',
    'SHOTGUNS': 'Дробовики',
    'SOVEREIGN HUNTING RIG': 'Охотничий риг Sovereign',
    'SPYRE HUNTER EQUIPMENT LIST': 'Список снаряжения охотников Шпиля',
    'SPYRE HUNTING PARTY GANG COMPOSITION': 'Состав охотничьей партии Шпиля',
    'SPYRER BASE CAMP': 'Базовый лагерь шпайреров',
    'SPYRER EQUIPMENT': 'Снаряжение шпайреров',
    'SPYRER HUNTING RIG GLITCHES': 'Сбои охотничьего рига шпайрера',
    'SPYRER POST CYCLE ACTIONS': 'Пост-цикловые действия шпайрера',
    'SPYRER WEAPONS': 'Оружие шпайреров',
    'SUBJUGATOR WEAPONS': 'Оружие субъюгаторов',
    'SUIT EVOLUTION (SPYRER ONLY)': 'Эволюция костюма (только шпайрер)',
    'SUIT MAINTENANCE (SPYRER ONLY)': 'Обслуживание костюма (только шпайрер)',
    'SURVIVOR': 'Выживший',
    'SVENOTAR SCOUT TRIKE': 'Svenotar Scout Trike',
    'TENTACLES': 'Щупальца',
    'TERRITORY BOON': 'Бонус территории',
    'TERRORISE TERRITORY (SPYRER ONLY – MAX FIVE FIGHTERS)': 'Терроризировать территорию (только шпайрер, макс. 5 бойцов)',
    "THE GOD’S FAVOUR": 'Благоволение бога',
    'TOXIC BLOOD': 'Ядовитая кровь',
    'TOXIC WEAPONS': 'Токсичное оружие',
    'TOXIN WEAPONS': 'Токсиновое оружие',
    'TRAIN (SPYRER ONLY)': 'Тренировка (только шпайрер)',
    'UNIQUE TERRITORY -': 'Уникальная территория',
    'UNSTOPPABLE FORCE (FIGHTER ONLY)': 'Неудержимая сила (только боец)',
    "VAN SAAR ASH WASTES ‘ARACHNI-RIG’ 275 CREDITS": "Ван Саар Ash Wastes «Arachni-rig», 275 кредитов",
    'VOID SOUL': 'Пустотная душа',
    'VOX ARRAY': 'Вокс-решётка',
    'WARGEAR': 'Снаряжение',
    'WEAPON ACCESSORIES': 'Аксессуары оружия',
    'WEAPONS': 'Оружие',
    'WEB INCISOR & PAIRED WEB INCISOR': 'Web incisor и парные',
    'WEB WEAPONS': 'Паутинное оружие',
    'WILL OF THE PATRIARCH': 'Воля Патриарха',
    'WING MEMBRANES': 'Перепонки крыльев',
    'WYRD': 'Виард',
    'YELD HUNTING RIG': 'Охотничий риг Yeld',
    'YELD LASER GAUNTLET & PAIRED YELD LASER GAUNTLETS': 'Yeld laser gauntlet и парные',
    'YELD MISSILE GAUNTLET & PAIRED YELD MISSILE GAUNTLETS': 'Yeld missile gauntlet и парные',
    'YELD WEAPONS': 'Оружие Yeld',
    'YELD WINGS': 'Крылья Yeld',
    'NATURAL WEAPONS': 'Природное оружие',
    'VEHICLE WEAPONS': 'Оружие машин',
}

HEADINGS_NORM = {norm_key(k): v for k, v in HEADINGS.items()}

SUBTYPES = {
    'Fighter': 'Боец',
    'Vehicle': 'Машина',
    'Crew': 'Экипаж',
    'Leader': 'Лидер',
    'Champion': 'Чемпион',
    'Ganger': 'Гэнгер',
    'Prospect': 'Проспект',
    'Beast': 'Зверь',
    'Brute': 'Громила',
    'Pet': 'Питомец',
    'Flying': 'Летающий',
    'Wyrd': 'Виард',
    'Loner': 'Одиночка',
    'Hanger-on': 'Прихвостень',
    'Mounted': 'Наездник',
    'Specialist': 'Специалист',
    'Fanatic': 'Фанатик',
    'Pious': 'Праведный',
    'Spyrer': 'Шпайрер',
    'Ogryn': 'Огрин',
    'Ratling': 'Ратлинг',
    'Beastman': 'Зверолюд',
    'Tracked': 'Гусеничная',
    'Wheeled': 'Колёсная',
    'Walker': 'Шагоход',
    'Skimmer': 'Скиммер',
    'Support': 'Поддержка',
    'Hybrid': 'Гибрид',
}

SKILL_SETS = {
    'Agility': 'Ловкость',
    'Brawn': 'Сила',
    'Combat': 'Бой',
    'Cunning': 'Хитрость',
    'Savant': 'Эрудит',
    'Shooting': 'Стрельба',
    'Finesse': 'Finesse',
    'Muscle': 'Muscle',
    'Primary': 'Основной',
    'Secondary': 'Вторичный',
}

NAMED_RULE = re.compile(r'^([A-Z][A-Za-z\u2019\'\-\(\)0-9 ]{1,48}):\s+(\S.*)$')


def translate_heading(text):
    key = norm_key(text)
    if key in HEADINGS_NORM:
        return HEADINGS_NORM[key]
    return text.strip()


def translate_type(text):
    if not text:
        return text
    def repl(match):
        word = match.group(0)
        return SUBTYPES.get(word, word)
    return re.sub(r'[A-Za-z][A-Za-z\-]*', repl, text)


def translate_skill_cell(text):
    return SKILL_SETS.get(text, text)


# ---------------------------------------------------------------------------
# шаблоны повторяющихся фраз карточек
# ---------------------------------------------------------------------------

RE_EQUIP_BUY = re.compile(
    r'^(?:(?:Medic )?Equipment:\s*)?When added to a Gang Roster, an? (?P<who>.+?) may purchase '
    r'weapons and wargear from the (?P<lst>.+?)(?: Equipment List)?:?$',
    re.I)
RE_EQUIP_BUY_SPACE = re.compile(
    r'^(?:Equipment:\s*)?When added to a Gang Roster, an? (?P<who>.+?) may purchase '
    r'weapons and wargear from the (?P<lst>.+?) List:?$',
    re.I)
RE_EQUIP_INCLUDED = re.compile(
    r'^(?:Equipment:\s*)?An? (?P<who>.+?) is equipped with (?P<gear>.+?) '
    r'\(included in their (?:starting )?cost\) and, when added to a Gang Roster, '
    r'may purchase weapons and wargear from the (?P<lst>.+?)(?: Equipment List)?:?$',
    re.I)
RE_EQUIP_AFFILIATION = re.compile(
    r'^(?:Equipment:\s*)?When added to a Gang Roster, an? (?P<who>.+?) may purchase '
    r'weapons and wargear from the Equipment List granted to them by their '
    r'(?P<src>Affiliation|Leader.s Affiliation), the Outcast Equipment List and from the '
    r'Trading Post with a combined TP of (?P<tp>\d+) or less:?$',
    re.I)
RE_EQUIP_LEGACY = re.compile(
    r'^(?:Equipment:\s*)?When added to a Gang Roster, an? (?P<who>.+?) may purchase '
    r'weapons and wargear from an? Equipment List granted to them by their Gang Legacy'
    r'(?: and from the Trading Post with a combined TP of (?P<tp>\d+) or less)?:?$',
    re.I)
RE_ARMED_OPTIONS = re.compile(
    r'^(?:Equipment:\s*)?An? (?P<who>.+?) is armed with (?P<wep>.+?)\. '
    r'They may select (?:any of |from )?the (?:following|below) options? when added '
    r'to a Gang Roster(?:[;.] they may not purchase or be equipped with additional '
    r'weapons or wargear)?:?$',
    re.I)
RE_MAY_REPLACE = re.compile(
    r'^(?:[-•]\s*)?An? (?P<who>.+?) (?:may|can) replace (?:its|their) (?P<old>.+?) with '
    r'(?:an? )?(?P<new>.+?)\s*\.{0,80}\+?(?P<n>\d+)\s*(?:cr|credits)\.?$',
    re.I)
RE_MAY_BE_EQUIPPED = re.compile(
    r'^(?:[-•]\s*)?An? (?P<who>.+?) may be equipped with (?:an? )?(?P<item>.+?)'
    r'\s*\.{0,80}\+?(?P<n>\d+)\s*(?:cr|credits)\.?$',
    re.I)
RE_MAY_REPLACE_NOPRICE = re.compile(
    r'^(?:[-•]\s*)?An? (?P<who>.+?) (?:may|can) replace (?:its|their) (?P<old>.+?) with '
    r'(?:an? )?(?P<new>.+?)\.?$',
    re.I)
RE_MAY_BE_EQUIPPED_NOPRICE = re.compile(
    r'^(?:[-•]\s*)?An? (?P<who>.+?) may be equipped with (?:an? )?(?P<item>.+?)\.?$',
    re.I)
RE_REPLACE_THE = re.compile(
    r'^(?:[-•]\s*)?Replace the (?P<old>.+) with (?:an? )?(?P<new>.+?)'
    r'(?:\s*\.{2,}\s*\+?(?P<n>\d+)\s*(?:cr|credits))?\.?$',
    re.I)
RE_MOUNTED_OPTIONS = re.compile(
    r'^An? (?P<who>.+?) is equipped with (?P<gear>.+?)\. It may select '
    r'(?:any of )?the following options? when added to the Gang Roster or during '
    r'any Post-cycle Sequence:?$',
    re.I)
RE_CAMPAIGN = re.compile(
    r'^(?:[-•]\s*)?During the course of a campaign, they may be given additional '
    r'(?P<what>weapons and wargear|Pets) purchased from (?:the )?(?P<lst>.+?)'
    r'(?: and (?:from )?the Trading Post)?\.?$',
    re.I)
RE_START_SKILLS = re.compile(
    r'^Starting Skills?:\s*When added to a Gang Roster, all (?P<who>.+?) '
    r'may select one skill from one of their Primary Skill Sets\.?$',
    re.I)
RE_SKILL_ACCESS = re.compile(
    r'^Skill Access:\s*This gang(?:[\'’]s)? Fighters have access to the following Skill Sets:?$',
    re.I)
RE_LEASH = re.compile(
    r'^Leash Range:\s*An? (?P<who>.+?) has a (?P<rng>.+?) Leash range\.?$',
    re.I)
RE_ARMED = re.compile(
    r'^Equipment:\s*An? (?P<who>.+?) is armed with (?P<wep>.+?)\. '
    r'They may not purchase or be equipped with additional weapons or wargear\.?$',
    re.I)
RE_NO_WEAPONS = re.compile(
    r'^Equipment:\s*An? (?P<who>.+?) has no weapons\. '
    r'They may not purchase or be equipped with additional weapons or wargear\.?$',
    re.I)
RE_HAS_SKILL = re.compile(
    r'^(?P<label>Starting Skill|Skills):\s*An? (?P<who>.+?) has the (?P<sk>.+?) skill\.?$',
    re.I)
RE_CC_ONLY = re.compile(
    r'^(?:[-•]\s*)?They may only be equipped with weapons from the Close Combat Weapons '
    r'section of the (?P<lst>.+?) and the Trading Post\.?$',
    re.I)
RE_CREDITS = re.compile(
    r'^(?P<label>(?:[A-Z][A-Z\- ]*:\s*)?)(?P<n>\+?\d+)\s*credits?\s*'
    r'(?:[\u2013\u2014\-]\s*(?P<tp>TP\s*\d+|Exclusive))?$',
    re.I)
RE_EXCLUSIVE = re.compile(r'^Exclusive\s*$', re.I)


def _bare_noun(text):
    return re.sub(r'^(?:an?|the)\s+', '', (text or '').strip(), flags=re.I)


def _tpl_equip_buy(who, lst):
    lst = re.sub(r'\s+Equipment List$', '', lst, flags=re.I).strip()
    return ('Снаряжение: при добавлении в ростер банды %s может купить оружие и '
            'снаряжение из списка %s:' % (who, lst))


def try_templates(text):
    s = re.sub(r'\s+', ' ', text.strip())
    m = RE_EQUIP_AFFILIATION.match(s)
    if m:
        src = 'их принадлежностью' if m.group('src').lower() == 'affiliation' else 'принадлежностью лидера'
        return (
            'Снаряжение: при добавлении в ростер банды %s может купить оружие и '
            'снаряжение из списка, данного %s, из списка Outcast и с Trading Post '
            'на суммарно не больше %s TP:'
            % (m.group('who'), src, m.group('tp'))
        )
    m = RE_EQUIP_LEGACY.match(s)
    if m:
        tail = ''
        if m.group('tp'):
            tail = ' и с Trading Post на суммарно не больше %s TP' % m.group('tp')
        return (
            'Снаряжение: при добавлении в ростер банды %s может купить оружие и '
            'снаряжение из списка, данного Gang Legacy%s:'
            % (m.group('who'), tail)
        )
    m = RE_EQUIP_BUY.match(s) or RE_EQUIP_BUY_SPACE.match(s)
    if m:
        return _tpl_equip_buy(m.group('who'), m.group('lst'))
    m = RE_EQUIP_INCLUDED.match(s)
    if m:
        lst = re.sub(r'\s+Equipment List$', '', m.group('lst'), flags=re.I).strip()
        return (
            'Снаряжение: %s экипирован %s (входит в стоимость) и при добавлении '
            'в ростер банды может купить оружие и снаряжение из списка %s:'
            % (m.group('who'), _bare_noun(m.group('gear')), lst)
        )
    m = RE_ARMED_OPTIONS.match(s)
    if m:
        return (
            'Снаряжение: %s вооружён %s. При добавлении в ростер банды можно '
            'выбрать вариант ниже. Дополнительное оружие и снаряжение покупать '
            'и надевать нельзя.'
            % (m.group('who'), _bare_noun(m.group('wep')))
        )
    m = RE_MAY_REPLACE.match(s)
    if m:
        return '%s может заменить %s на %s: +%s кредитов' % (
            m.group('who'), m.group('old'), _bare_noun(m.group('new').rstrip('.')), m.group('n'))
    m = RE_MAY_BE_EQUIPPED.match(s)
    if m:
        return '%s может быть экипирован %s: +%s кредитов' % (
            m.group('who'), _bare_noun(m.group('item').rstrip('.')), m.group('n'))
    m = RE_MAY_REPLACE_NOPRICE.match(s)
    if m:
        return '%s может заменить %s на %s' % (
            m.group('who'), m.group('old'), _bare_noun(m.group('new').rstrip('.')))
    m = RE_MAY_BE_EQUIPPED_NOPRICE.match(s)
    if m:
        return '%s может быть экипирован %s' % (
            m.group('who'), _bare_noun(m.group('item').rstrip('.')))
    m = RE_REPLACE_THE.match(s)
    if m:
        ru = 'Заменить %s на %s' % (
            m.group('old'), _bare_noun(m.group('new').rstrip('.')))
        if m.group('n'):
            ru += ': +%s кредитов' % m.group('n')
        return ru
    m = RE_MOUNTED_OPTIONS.match(s)
    if m:
        return (
            '%s экипирован %s. Он может выбрать следующий вариант при добавлении '
            'в ростер банды или в любой пост-цикловой последовательности:'
            % (m.group('who'), _bare_noun(m.group('gear')))
        )
    m = RE_CAMPAIGN.match(s)
    if m:
        lst = re.sub(r'\s+(Equipment )?List$', '', m.group('lst'), flags=re.I)
        if m.group('what').lower() == 'pets':
            ru = 'В ходе кампании им можно давать дополнительных питомцев из списка %s' % lst
        else:
            ru = ('В ходе кампании им можно давать дополнительное оружие и снаряжение, '
                  'купленное из списка %s' % lst)
        if 'trading post' in s.lower():
            ru += ' и с Trading Post'
        return ru + '.'
    m = RE_START_SKILLS.match(s)
    if m:
        who = m.group('who')
        return ('Стартовые навыки: при добавлении в ростер банды все %s могут выбрать '
                'один навык из одного из своих основных наборов (Primary Skill Sets).' % who)
    m = RE_SKILL_ACCESS.match(s)
    if m:
        return 'Доступ к навыкам: бойцы этой банды имеют доступ к следующим наборам навыков:'
    m = RE_LEASH.match(s)
    if m:
        return 'Длина поводка: у %s длина поводка (Leash range) %s.' % (
            m.group('who'), m.group('rng'))
    m = RE_ARMED.match(s)
    if m:
        return ('Снаряжение: %s вооружён(а) %s. Дополнительное оружие и снаряжение '
                'покупать и надевать нельзя.' % (m.group('who'), _bare_noun(m.group('wep'))))
    m = RE_NO_WEAPONS.match(s)
    if m:
        return ('Снаряжение: у %s нет оружия. Дополнительное оружие и снаряжение '
                'покупать и надевать нельзя.' % m.group('who'))
    m = RE_HAS_SKILL.match(s)
    if m:
        label = 'Стартовый навык' if m.group('label').lower().startswith('starting') else 'Навыки'
        return '%s: у %s есть навык %s.' % (label, m.group('who'), m.group('sk'))
    m = RE_CC_ONLY.match(s)
    if m:
        lst = re.sub(r'\s+Equipment List$', '', m.group('lst'), flags=re.I).strip()
        return ('Их можно экипировать только оружием из раздела оружия ближнего боя '
                'списка %s и Trading Post.' % lst)
    m = RE_CREDITS.match(s)
    if m:
        label = m.group('label') or ''
        n = m.group('n')
        tp = m.group('tp')
        ru = '%s%s кредитов' % (label, n)
        if tp:
            ru += ' — %s' % tp
        return ru
    if RE_EXCLUSIVE.match(s):
        return 'Эксклюзив'
    return None


# ---------------------------------------------------------------------------
# словарь уникальных правил (подгружается из сгенерированных файлов)
# ---------------------------------------------------------------------------

TRANSLATIONS = {}
DOT_PRICE = re.compile(r'(?:\s*\.{2,})?\s*\+?\d+\s*(?:cr|credits)\.?$', re.I)


def _strip_leading_bullets(text):
    return re.sub(r'^(?:[•\-]\s+)+', '', text or '')


def _key_variants(text):
    k = norm_key(text)
    if not k:
        return set()
    variants = {k, k.rstrip(' .:;—-')}
    no_bullet = _strip_leading_bullets(k)
    variants.add(no_bullet)
    variants.add(no_bullet.rstrip(' .:;—-'))
    no_price = DOT_PRICE.sub('', k).strip()
    variants.add(no_price)
    variants.add(no_price.rstrip(' .:;—-'))
    variants.add(_strip_leading_bullets(no_price).rstrip(' .:;—-'))
    return {item for item in variants if item}


def _register(key, val):
    val = _strip_leading_bullets(val) if val else val
    for item in _key_variants(key):
        TRANSLATIONS[item] = val
        TRANSLATIONS[item + ':'] = val
        TRANSLATIONS[item + '.'] = val


def lookup_translation(text):
    for item in _key_variants(text):
        hit = TRANSLATIONS.get(item) or TRANSLATIONS.get(item + ':') or TRANSLATIONS.get(item + '.')
        if hit:
            return hit
    return None


def _load_extra_dicts():
    import importlib
    for mod_name in ('i18n_prose', 'i18n_rules', 'i18n_misc'):
        try:
            mod = importlib.import_module(mod_name)
        except ImportError:
            continue
        data = getattr(mod, 'DICT', None) or getattr(mod, 'TRANSLATIONS', None)
        if isinstance(data, dict):
            for key, val in data.items():
                _register(key, val)


_load_extra_dicts()


def _strip_bullet(text):
    text = (text or '').strip()
    match = re.match(r'^([•\-]\s+)(.*)$', text, re.S)
    if match:
        return match.group(1), match.group(2)
    return '', text


def _peel_credit_price(text):
    m = re.search(
        r'(?:\s*\.{2,})?\s*\+?(\d+)\s*(?:cr|credits)\.?$',
        (text or '').strip(),
        re.I,
    )
    return m.group(1) if m else None


def _with_price(ru, n):
    if not n:
        return ru
    if re.search(r'\d+\s*кредит', ru or '', re.I):
        return ru
    return (ru or '').rstrip('. ') + ': +%s кредитов' % n


def translate(text):
    """Английский фрагмент правил → русский. Имена бойцов и термины сохраняются."""
    if not text:
        return text
    bullet, raw = _strip_bullet(text)
    headed = translate_heading(raw)
    if headed != raw:
        return bullet + headed
    n = _peel_credit_price(raw)
    hit = lookup_translation(raw)
    if hit:
        return bullet + _with_price(_strip_leading_bullets(hit), n)
    tpl = try_templates(raw)
    if tpl:
        return bullet + _with_price(_strip_leading_bullets(tpl), n)
    m = NAMED_RULE.match(raw)
    if m:
        term, body = m.group(1), m.group(2)
        t_ru = lookup_translation(term) or translate_heading(term)
        b_tpl = try_templates(body)
        b_ru = b_tpl or lookup_translation(body)
        if (t_ru != term) or b_ru:
            t_out = _strip_leading_bullets(t_ru if t_ru != term else term)
            return bullet + '%s: %s' % (t_out, _strip_leading_bullets(b_ru or body))
    return text


def render_named_or_plain(en_text):
    """Абзац правил: термин с коротким оригиналом, тело — по лимиту слов."""
    en_text = (en_text or '').strip()
    ru = translate(en_text)
    _bullet, core = _strip_bullet(en_text)
    en_m = NAMED_RULE.match(core)
    if en_m and ':' in ru:
        term_ru, body_ru = ru.split(':', 1)
        term_ru = _strip_leading_bullets(term_ru.strip())
        term_html = '%s:<span class="orig">%s</span>' % (
            esc(term_ru.strip()), esc(en_m.group(1)))
        body = orig_block(esc(body_ru.strip()), en_m.group(2))
        return '<p><span class="term">%s</span> %s</p>' % (term_html, body)
    return '<p>%s</p>' % orig_block(esc(ru), en_text)
