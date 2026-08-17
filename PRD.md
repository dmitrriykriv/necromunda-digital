# Necromunda Gang Wars — Product Requirements Document (PRD)

> **Версия:** 1.0 &nbsp;|&nbsp; **Дата:** 2026-08-17 &nbsp;|&nbsp; **Язык:** Русский

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

### MVP — Sprint 1–3 (~6 недель)
- [ ] Статический справочник правил (React-компонент)
- [ ] Аутентификация (email + Google)
- [ ] Построитель ростера для Goliath
- [ ] Валидация ростера (лимиты, credits)
- [ ] PDF-экспорт ростера

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

**Документ составлен на основе `SCENARIOS.md` и `TECH_STACK.md`.**

**Следующий шаг:** Инициализация монорепо  
```bash
npm create vite@latest frontend -- --template react-ts
```
