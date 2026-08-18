# Necromunda Digital

Справочник правил Necromunda и построитель ростера для личного использования.

Структура разделов справочника на русском, тексты правил — в оригинале
(SKIRMUNDA и списки банд). Приложение не является официальным продуктом
Games Workshop.

---

## Что уже работает

- Статический HTML-справочник: основные правила, 19 списков банд, учебный
  ростер Дома Каудор на 1000 кредитов.
- Построитель ростера (React): выбор банды, типы и подтипы бойцов, снаряжение
  из каталога, апгрейды вроде warp rounds, рейтинг и проверка состава
  (один Leader, лимит чемпионов/громил).
- Карточки для печати: характеристики, навыки, профили оружия и описания
  снаряжения.

Пока нет аккаунтов и PostgreSQL (план — [PRD.md](./PRD.md)): ростеры временно
пишутся в `rosters/*.json`, черновик дублируется в браузере. Если API
недоступен, JSON можно скачать. Целевое хранение — база, не файлы.

---

## Запуск

Нужны **Node.js 20+** и npm.

```bash
npm install
npm run build
npm start
```

Затем откройте:

| Страница | Адрес |
| --- | --- |
| Справочник | http://127.0.0.1:8000/ |
| Построитель | http://127.0.0.1:8000/pages/roster-builder.html |
| По сети | `http://<IP-этого-ПК>:8000/` |

Сервер слушает все интерфейсы (`0.0.0.0:8000`), каталоги банд отдаются и
локально, и по LAN. Порт можно сменить переменной `PORT`, адрес —
`HOST` (например `HOST=127.0.0.1` только для этого компьютера).

Разработка с горячей перезагрузкой:

```bash
npm run dev
```

Поднимаются Express на `:8000` и Vite на `:5173`. После правок в `frontend/`
для `npm start` снова нужен `npm run build`.

Другие команды:

```bash
npm test          # vitest
npm run lint      # eslint frontend
```

Пример ростера: `rosters/gimn-pepelnoj-chasovni.json` (Дом Каудор, 1000 cr).

---

## Стек

| Часть | Технологии |
| --- | --- |
| Справочник | HTML + CSS (`pages/styles.css`) |
| Построитель | React 18, Vite, TypeScript, Tailwind, shadcn/ui, Zustand, TanStack Query |
| API | Express + TypeScript |
| Общие типы | `shared/roster.ts`, `shared/catalog.ts` |

---

## Структура

```
Necromunda Digital/
├── index.html                 главная справочника
├── pages/                     HTML-страницы, стили и favicon
│   ├── core-rules.html
│   ├── gangs.html
│   ├── roster-example.html
│   ├── roster-builder.html    редирект на frontend/dist
│   ├── styles.css
│   └── favicon.svg
├── frontend/                  React-построитель (base: './')
├── backend/                   Express: /api/rosters, статика, /data
├── shared/                    типы ростера и каталога
├── data/factions/             JSON каталогов банд (типы, статы, снаряжение)
├── rosters/                   временно: сохранённые ростеры (до PostgreSQL)
├── tools/                     сборка справочника и каталога
└── rules/                     исходные PDF
```

При `npm run build` каталоги из `data/` копируются в `frontend/dist/data/`,
чтобы построитель открывался и с удалённого хоста, не только с localhost.

### API ростеров (временная заглушка до `/gangs` и БД)

| Метод | Путь | Назначение |
| --- | --- | --- |
| GET | `/api/health` | проверка сервера |
| GET | `/api/rosters` | список (`rosters/index.json`) |
| GET | `/api/rosters/:file` | один ростер |
| PUT | `/api/rosters` | записать JSON в `rosters/` |
| DELETE | `/api/rosters/:file` | удалить файл |

---

## Справочник правил

| Файл | Раздел | Источник |
| --- | --- | --- |
| `pages/core-rules.html` | Основные правила | `Правила/SKIRMUNDA.pdf` |
| `pages/gangs.html` | 19 списков банд | `Правила/GANGS0_3.pdf` |
| `pages/roster-example.html` | Учебный ростер Каудор | SKIRMUNDA + список Каудор |

Раздел банды свёрнут в блоки: бойцы (карточки тоже сворачиваются), список
снаряжения и экипировка. В списках название предмета раскрывает профиль.
Якорные ссылки в `gangs.html` раскрывают цепочку `<details>` над целью.

Страницу банд собирает `tools/build_gangs.py`. Правки профилей вносите через
скрипт: Trading Post из `tools/rules_raw.txt` и таблицы банды из
`tools/gangs_raw.txt` (профиль банды приоритетнее).

```bash
python tools/build_gangs.py
python tools/_qa.py
```

Каталог для построителя (типы бойцов, характеристики, оружие, описания,
апгрейды) извлекается из уже собранного `pages/gangs.html`:

```bash
python tools/extract_faction_lists.py
```

После этого снова `npm run build`, чтобы JSON попали в `frontend/dist`.

---

## Документация

| Файл | Содержание |
| --- | --- |
| [PRD.md](./PRD.md) | Целевые требования (кампании, аккаунты) — шире текущего кода |
| [SCENARIOS.md](./SCENARIOS.md) | Сценарии использования из того же плана |
| [TECH_STACK.md](./TECH_STACK.md) | Исходный выбор стека; БД и OAuth в коде не используются |

---

## Авторские права

Игровые правила и механики: © Games Workshop. Necromunda™ — торговая марка
Games Workshop Ltd. Этот проект для личного использования, в рамках fan-use
policy, и не является официальным продуктом.
