# Necromunda Gang Wars — Product Requirements Document (PRD)

> **Версия:** 1.1 &nbsp;|&nbsp; **Дата:** 2026-08-18 &nbsp;|&nbsp; **Язык:** Русский

> **1.1:** добавлен факт текущей сборки (разд. 3.0, 4.3, 5.1, 7.1, 9). Запись банд в файлы — временная заглушка, не целевое хранение. Исходный план кампании и аккаунтов сохранён.

---

## 1. Цель проекта

Веб-приложение для управления кампанией в настольной игре **Necromunda: Gang Wars** от Games Workshop. Приложение автоматизирует рутинные расчёты (стоимость банды, опыт, раны, доход территорий), предоставляет удобный справочник правил и позволяет группе игроков (Arbitrator + Players) вести совместную кампанию онлайн.

### Ключевые проблемы, которые решает приложение

| Проблема | Решение |
|----------|---------|
| Сложные расчёты credits и Gang Rating вручную | Автоматический калькулятор ростера |
| Многочисленные таблицы и ссылки в книгах правил | Встроенный справочник с поиском |
| Трудно синхронизировать состояние кампании между игроками | Облачное хранилище, реальное время |
| Забывают применять post-battle sequence полностью | Пошаговый мастер после боя |
| PDF-ростеры устаревают после каждого изменения | Живой ростер с экспортом по запросу |

---

## 2. Целевая аудитория

- Игровые группы 2–8 человек, ведущие совместную Dominion- или Law&Misrule-кампанию
- Одиночные игроки, собирающие ростеры и изучающие правила
- Арбитры (Arbitrator), управляющие ходом кампании

**Технический уровень пользователей:** базовый — приложение должно быть интуитивным без инструкции.

---

## 3.0 Фактически реализовано (вне исходного плана)

Ниже — то, что уже в коде и не совпадает с исходным MVP (React-справочник, auth, Goliath-only, PDF листа банды). Целевой план в §§3.1–3.5 и §9 не отменяется. Запись ростеров в файлы — временная заглушка до PostgreSQL (§4.1), в «сделано вне плана» не входит.

### Справочник — статический HTML, не SPA

- Главная `index.html` и страницы в `pages/`: основные правила, 19 списков банд, учебный ростер Каудор.
- Оглавление и подписи на русском, полный текст правил в оригинале (спойлеры «Оригинал»).
- Карточки бойцов и предметы снаряжения — свёрнутые `<details>`, профили оружия по клику на название.
- Якорные ссылки в `gangs.html` раскрывают цепочку свёрнутых блоков до цели.
- Печать справочника через CSS `@media print` (раскрываются folds). Полнотекстовый поиск, закладки и Service Worker **не** сделаны.
- Сборка `pages/gangs.html`: `tools/build_gangs.py` из `tools/rules_raw.txt` и `tools/gangs_raw.txt`.

### Построитель — каталог всех банд, не одна фракция

- React-приложение в `frontend/`, точка входа с главной: `pages/roster-builder.html` → `frontend/dist/`.
- **Все банды из справочника** в каталоге `data/factions/<id>.json` (дома, культы, кочевники, энфорсеры и т.д.; у Венаторов пока только типы бойцов). Исходный MVP ограничивал Goliath, затем «6 домов».
- Каталог **извлекается из HTML справочника** (`tools/extract_faction_lists.py`), а не из отдельных seed `weapons.json` / `fighter-types.json`.
- В каталоге: типы и подтипы, стартовый XP и стоимость, **таблица характеристик**, особые правила типа, снаряжение с профилями (SR/LR/S/AP/L, traits + тексты), описания брони/wargear, **апгрейды патронов** (`upgrades`, напр. warp rounds +10 cr).
- Снаряжение в UI сгруппировано по списку банды и категории; слоты и цена подставляются из каталога (`*` → 2 слота, броня/гранаты → 0).
- Валидация мягкая: предупреждения (ровно один Leader; чемпионов/громил/прихвостней не больше остальных). Сохранение **не** блокируется.
- Нет привязки к кампании, stash как склад предметов, Hired Guns, Alliance, публичных ссылок.

### Карточки бойцов для печати (не PDF листа банды)

Исходный план: PDF A4 «лист банды» и «краткий PDF». Сделано иначе:

- Отдельная страница построителя (`#/print`): по карточке на каждого бойца.
- На карточке: имя, тип, подтипы, XP, стоимость, таблица характеристик из каталога, навыки, особые правила типа, снаряжение с профилями и текстами правил, расшифровка traits.
- Выбранные апгрейды (warp rounds и др.) попадают в профиль и стоимость.
- Экран — тёмные карточки в цветах справочника; печать — светлые, через `window.print()`.

### Доступ не только с localhost

Исходный стек предполагал Vercel/Render. Фактически локальный/LAN-сервер:

- Express слушает `0.0.0.0:8000` (переменные `HOST`, `PORT`).
- Каталоги копируются в `frontend/dist/data/` при `npm run build`; построитель грузит JSON **относительно страницы**, а не с абсолютного `/data/` на localhost.
- HashRouter и `base: './'`, чтобы работало с `file://`, статикой Apache и путём `/frontend/dist/`.
- Абсолютный префикс `/roster/` для UI **отвергнут**: ломал открытие HTML как файла и чужой document root.

### API, которое есть сейчас

Вместо `/auth/*`, `/gangs/*`, `/reference/*` временно (до БД):

```
GET    /api/health
GET    /api/rosters
GET    /api/rosters/:file
PUT    /api/rosters
DELETE /api/rosters/:file
GET    /data/factions/:id.json     (статика каталога)
```

---

## 3. Функциональные требования

### 3.1 Справочник правил

**Приоритет: MVP**

- Структурированный справочник с боковой навигацией
- Разделы: Характеристики, Ход игры, Движение, Стрельба, Ближний бой, Мораль, Кампания, Оружие, Навыки, Фракции
- Полнотекстовый поиск по всем разделам
- Режим «шпаргалки» — одна страница с ключевыми таблицами
- Офлайн-доступ через Service Worker
- Версия для печати (CSS print media)

### 3.2 Построитель ростера

**Приоритет: MVP**

- Выбор фракции из списка (MVP: Goliath, Escher, Cawdor, Orlock, Van Saar, Delaque)
- Добавление бойцов с автоматическим применением ограничений:
  - Типы бойцов, доступные фракции
  - Снаряжение, доступное каждому типу бойца
  - Лимиты (1 Leader, ≤2 Champions, минимум Gangers)
- Реалтайм-расчёт стоимости в credits и Gang Rating
- Валидация с подсветкой ошибок
- Экспорт: PDF (A4), JSON, публичная ссылка только для просмотра

### 3.3 Управление кампанией

**Приоритет: v1.0**

- Создание кампании: название, тип (Dominion / Law&Misrule), список участников
- Роли: Arbitrator (полный доступ), Player (только своя банда), Observer (только просмотр)
- Карта территорий с визуализацией владения
- Запись результатов боя: победитель, трофеи, события

### 3.4 Post-Battle Sequence (мастер)

**Приоритет: v1.0**

Пошаговый интерактивный мастер:
1. Определить результат боя
2. Собрать доход с территорий
3. Начислить XP бойцам
4. Обработать выбывших бойцов (Lasting Injury D66)
5. Провести Адвансменты (2D6 → таблица)
6. Торговля (Trading Post, Black Market)
7. Обновить Gang Rating автоматически

### 3.5 Управление пользователями

**Приоритет: MVP**

- Регистрация по email + OAuth (Google)
- Профиль: ник, аватар, любимая фракция
- JWT-аутентификация, refresh tokens
- Изоляция данных: игрок видит чужие банды только в read-only режиме


---

## 4. Модель данных

### 4.1 Основные сущности

**User** — id, email, passwordHash, nickname, avatar, createdAt

**Campaign** — id, name, type (DOMINION | LAW_MISRULE), status, createdAt  
→ CampaignMember[] (userId, campaignId, role: ARBITRATOR | PLAYER | OBSERVER)

**Gang** — id, name, factionId, credits, gangRating, reputation, userId, campaignId  
→ Fighter[]

**Fighter** — id, gangId, name, type (LEADER | CHAMPION | GANGER | JUVE | SPECIALIST)  
characteristics: M, WS, BS, S, T, W, I, A, Ld, Cl, Wil, Int  
xp, advancements, kills, fleshWounds  
status: ACTIVE | RECOVERY | DEAD | CAPTIVE  
→ FighterEquipment[]

**FighterEquipment** — id, fighterId, itemId, itemType (WEAPON | ARMOUR | WARGEAR)

**BattleRecord** — id, campaignId, scenarioId, date, notes  
→ BattleParticipant[] (gangId, isWinner, creditsEarned, xpBonus)  
→ FighterBattleResult[] (fighterId, result: ACTIVE|INJURY|OOA, injuryRoll)

**Territory** — id, name, type, income, bonusRule  
**GangTerritory** — gangId, territoryId, since

### 4.2 Справочные данные (JSON seed — только для чтения)

```
data/
├── factions.json        — фракции, доступные типы бойцов
├── fighter-types.json   — базовые характеристики, cost, allowed equipment
├── weapons.json         — range, acc S/L, str, AP, D, ammo, traits
├── wargear.json         — броня, гранаты, personal equipment
├── skills.json          — категории навыков и конкретные умения
├── territories.json     — территории, доходы, бонусы
├── scenarios.json       — сценарии, условия победы, награды
└── advancements.json    — таблица адвансментов (2D6)
```

### 4.3 Текущая форма объектов ростера

Поля, с которыми работает построитель (`shared/roster.ts`). Целевое хранение — сущности §4.1 в PostgreSQL; сейчас те же объекты временно пишутся на диск.

**Roster** — id, name, faction, factionName, notes, reputation, stash (число кредитов, не склад предметов), fighters[], updatedAt

**Fighter** — id, name, type (строка из каталога, напр. `Cawdor Word-Keeper`), subtypes[] (`Leader`, `Pious`, …), xp, baseCost, skills[], equipment[]

**Equipment** — name, cost (база + выбранные extras), slots, extras?[] (имена апгрейдов)

Характеристики и описания снаряжения **не дублируются в ростере**: подтягиваются из каталога фракции при просмотре и печати.

**Каталог** `data/factions/<id>.json` (`shared/catalog.ts`): types[] (stats.keys/values, rules?), equipment[] (profiles[], description?, upgrades[]). Это seed справочника (§4.2), не замена БД пользовательских банд.

---

## 5. API (REST)

### Аутентификация
```
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

### Банды и бойцы
```
GET  /gangs                          — список своих банд
POST /gangs                          — создать банду
GET  /gangs/:id                      — полный ростер
PUT  /gangs/:id                      — обновить
DEL  /gangs/:id

GET  /gangs/:id/fighters
POST /gangs/:id/fighters
PUT  /fighters/:id
DEL  /fighters/:id

POST /fighters/:id/equipment         — добавить снаряжение
DEL  /fighters/:id/equipment/:eid
```

### Кампания
```
GET  /campaigns                      — список кампаний пользователя
POST /campaigns                      — создать
GET  /campaigns/:id                  — детали + карта территорий
POST /campaigns/:id/join             — присоединиться по invite-коду
POST /campaigns/:id/battles          — записать результат боя
POST /campaigns/:id/post-battle      — провести post-battle sequence
GET  /campaigns/:id/standings        — турнирная таблица
```

### Справочник (публичный, кэшируется)
```
GET /reference/factions
GET /reference/factions/:id/fighter-types
GET /reference/weapons
GET /reference/skills
GET /reference/territories
GET /reference/scenarios
```

### 5.1 Временный API ростера

Заглушка до `/gangs` и PostgreSQL. Тело PUT — объект Roster; ответ `{ ok, file, roster, index }`. Имя файла — slug от id/названия.

---

## 6. Нефункциональные требования

| Категория | Требование |
|-----------|-----------|
| **Производительность** | Первая загрузка <3 сек на мобильном 4G; API <200 мс |
| **Доступность** | Uptime 99% (Render cold start ~15 сек допустим) |
| **Безопасность** | Prisma ORM, HTTPS everywhere, OWASP Top-10 |
| **Офлайн** | Service Worker кэширует справочник и текущую банду |
| **Адаптивность** | desktop / tablet (768px+) / mobile (360px+) |
| **Локализация** | Интерфейс RU, правила EN (оригинал) |
| **Версионирование** | SemVer; changelog для изменений правил |
| **GDPR** | Экспорт и удаление всех данных пользователя |

---

## 7. Технологический стек

*(Детали см. TECH_STACK.md)*

```
Frontend:  React 18 + Vite + TypeScript
           Tailwind CSS + shadcn/ui
           Zustand (state) + TanStack Query (server state)
           React Router v6
           Workbox (Service Worker / offline)

Backend:   Node.js 20 + Express + TypeScript
           Better Auth (email + Google OAuth)
           Prisma ORM

Database:  PostgreSQL 16 (Neon — бесплатно в облаке)
           SQLite для локальной разработки

Хостинг:   Frontend → Vercel
           Backend  → Render
           DB       → Neon / Supabase

Тесты:     Vitest + Testing Library (frontend)
           Jest + Supertest (backend API)

CI/CD:     GitHub Actions (lint → test → deploy)
```

### 7.1 Фактический стек текущей сборки

```
Справочник:  статический HTML/CSS (не React, не Workbox)
Построитель: React 18 + Vite + TypeScript + Tailwind + shadcn/ui
             Zustand persist + TanStack Query + HashRouter
API:         Express + TypeScript
Каталог:     data/factions/*.json (seed из справочника)
Тесты:       Vitest (расчёт ростера и хелперы каталога)
Запуск:      npm start, LAN :8000
```

Хранение пользовательских банд — временная запись на диск; целевое — PostgreSQL + Prisma (§7). Монорепо npm workspaces: `frontend/`, `backend/`, типы в `shared/`.

---

## 8. Структура репозитория

```
necromunda-app/
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
├── frontend/
│   ├── src/
│   │   ├── components/      — переиспользуемые UI-компоненты
│   │   │   ├── ui/          — shadcn/ui базовые компоненты
│   │   │   ├── roster/      — компоненты ростера
│   │   │   ├── campaign/    — компоненты кампании
│   │   │   └── rules/       — компоненты справочника
│   │   ├── pages/           — страницы (роуты)
│   │   ├── store/           — Zustand слайсы
│   │   ├── api/             — TanStack Query хуки + axios
│   │   ├── types/
│   │   └── utils/
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── prisma/
│   └── package.json
├── data/                   — seed JSON с игровыми данными
└── docs/
    ├── PRD.md
    ├── SCENARIOS.md
    └── TECH_STACK.md
```




---

## 9. Дорожная карта

### Сделано вне исходного MVP (2026-08)
- [x] Статический HTML-справочник (не React-компонент)
- [x] Построитель ростера на каталоге из `gangs.html` (не только Goliath)
- [x] Карточки бойцов для печати (характеристики + описания снаряжения)
- [x] Апгрейды оружия в каталоге (warp rounds и прочие +N cr)
- [x] Доступ по LAN: Express `0.0.0.0`, каталог внутри `frontend/dist`

### MVP — Sprint 1–3 (~6 недель)
- [x] Статический справочник правил *(HTML, не React-компонент)*
- [ ] Аутентификация (email + Google)
- [x] Построитель ростера *(каталог всех банд справочника, не только Goliath)*
- [x] Валидация ростера (лимиты состава — предупреждения, не жёсткая блокировка)
- [ ] PDF-экспорт ростера *(есть печать карточек бойцов, не лист A4)*

### v1.0 — Sprint 4–7 (~8 недель)
- [ ] Все 6 домов (Goliath, Escher, Cawdor, Orlock, Van Saar, Delaque)
- [ ] Создание кампании (Dominion)
- [ ] Запись результатов боя
- [ ] Post-battle sequence (интерактивный мастер)
- [ ] Карта территорий
- [ ] Турнирная таблица кампании

### v2.0 — Sprint 8–12 (~8 недель)
- [ ] Все фракции (Enforcers, Cultists, Outlanders, Ash Wastes)
- [ ] Hired Guns и Alliances
- [ ] Полный поиск по справочнику
- [ ] Офлайн-режим (Service Worker)
- [ ] Мобильная оптимизация
- [ ] История кампании и статистика

---

## 10. Риски и ограничения

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Авторское право на правила | Средняя | Высокое | Только механики (числа, таблицы), fan-use policy |
| Изменения правил (FAQ/errata) | Высокая | Среднее | Версионирование seed-данных, уведомления |
| Сложность всех фракций | Высокая | Среднее | Начать с 1–2 фракций, итеративно |
| Render cold start (15 сек) | Высокая | Низкое | Ping endpoint каждые 14 мин / платный тариф |
| Потеря данных при миграции | Низкая | Высокое | Резервные копии Neon, review миграций |

---

## 11. Глоссарий

| Термин | Описание |
|--------|----------|
| **Gang Rating** | Суммарная стоимость всех бойцов + снаряжения в credits |
| **Credits** | Игровая валюта Necromunda |
| **Arbitrator** | Ведущий кампании, аналог Game Master |
| **Post-Battle Sequence** | Обязательная последовательность действий после боя |
| **Dominion Campaign** | Кампания, где банды борются за территории |
| **Lasting Injury** | Постоянное ранение, изменяющее характеристики |
| **Advancement** | Улучшение характеристики или получение навыка за XP |
| **Out of Action (OOA)** | Боец выведен из строя в бою |
| **Trading Post** | Магазин снаряжения в post-battle sequence |

---

**Документ составлен на основе `SCENARIOS.md` и `TECH_STACK.md`.** Факт сборки — §3.0; запуск — `README.md`.
