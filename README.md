# Necromunda Digital

Справочник правил Necromunda и построитель ростера для личного использования.

Справочник на русском: разделы и тексты правил переведены, оригинал лежит
под спойлером. Имена собственные остаются на английском. Источники —
SKIRMUNDA и списки банд. Приложение не является официальным продуктом
Games Workshop.

---

## Что уже работает

- Статический HTML-справочник: основные правила, 19 списков банд, подсказка
  по ведению кампании, генератор миссий, учебный ростер Дома Каудор на
  1000 кредитов.
- Черновик помощника арбитра: игроки и банды, территории с доходом и
  настройкой списка, случайная генерация пула, цикл, действия и триумфы.
  Кампания пишется в `campaigns/<id>/`. Ростер игрока — копия общего файла;
  после завершения кампании копию можно вернуть в `rosters/`.
- Построитель ростера (React): выбор банды, типы и подтипы бойцов, снаряжение
  из каталога, апгрейды вроде warp rounds, рейтинг и проверка состава.
  Нужен ровно один Leader. Моделей с Champion, Brute или Hanger-on не больше
  остальных: Leader считается среди остальных, питомцы не считаются. У части
  банд эти проверки отключены.
- Печать: карточки с характеристиками, навыками, профилями оружия и описаниями
  снаряжения, а также бирки 63×88 мм.

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

## Установка на Ubuntu 22.04

На сервере нужны SSH и sudo. Со своего компьютера скопируйте
`tools/deploy/remote.local.example` в `tools/deploy/remote.local` и укажите
`TARGET=user@адрес-сервера`. Этот файл в git не попадает.

`SSH_PASSWORD_MODE=ask` спрашивает пароль при подключении. `file` берёт его
из `SSH_PASSWORD` и передаёт и в SSH, и в sudo, без вопросов. Если пароль
неверный или сервер не отвечает, скрипт напишет ошибку, а не зависнет.
Домен и прочие флаги установщика пишутся строками `--domain example.com`.

```powershell
powershell -File tools/deploy/remote.ps1
```

Окно не закроется само: в конце нужно нажать Enter. Тот же текст пишется в
`tools/deploy/remote.log`.

Скрипт скачивает установщик с GitHub, ставит Node.js, клонирует проект
в `/opt/necromunda`, собирает его и открывает сайт через nginx:
`http://<IP-сервера>/`. Повторный запуск подтягивает новый код с GitHub
и не затирает сохранённые ростеры.

Тот же запуск из bash: `bash tools/deploy/remote.sh`.

Перезапуск уже установленной службы, с тем же `remote.local`:

```powershell
powershell -File tools/deploy/restart.ps1
```

На сервере это `systemctl restart necromunda`: тот же `npm start` в каталоге установки. Окно ждёт Enter, вывод пишется в `tools/deploy/remote.log`. Из bash: `bash tools/deploy/restart.sh`.

Прямо на сервере:

```bash
curl -fsSL -o install-ubuntu.sh \
  https://raw.githubusercontent.com/dmitrriykriv/necromunda-digital/main/tools/deploy/install-ubuntu.sh
sudo bash install-ubuntu.sh
```

---

## Стек

| Часть | Технологии |
| --- | --- |
| Справочник | HTML + CSS (`pages/styles.css`) |
| Построитель | React 18, Vite, TypeScript, Tailwind, shadcn/ui, Zustand, TanStack Query |
| API | Express + TypeScript |
| Общие типы | `shared/roster.ts`, `shared/catalog.ts`, `shared/statTips.ts` |

---

## Структура

```
Necromunda Digital/
├── index.html                      главная справочника
├── pages/
│   ├── core-rules.html             основные правила
│   ├── gangs.html                  каталог банд
│   ├── gangs/                      19 страниц списков банд
│   ├── campaign-helper.html        подсказка по кампании
│   ├── campaign-arbitrator.html    стол арбитра
│   ├── mission-helper.html         генерация миссий
│   ├── roster-example.html         учебный ростер
│   ├── roster-builder.html         редирект на frontend/dist
│   ├── handbook-search.js          поиск и подсказки свойств
│   ├── styles.css
│   └── favicon.svg
├── frontend/                       React-построитель (base: './')
│   └── src/pages/                  ростер, печать карточек и бейджей 63×88
├── backend/src/                    Express: /api/rosters, статика, /data
├── shared/                         roster.ts, catalog.ts, statTips.ts
├── data/factions/                  JSON каталогов: index и 19 банд
├── rosters/                        общие ростеры, не привязанные к кампании
├── campaigns/                      столы кампаний, каталог в git не входит
│   └── <id>/                       campaign, players, territories, types,
│                                   names, cycles/ и rosters/ — копии банд
├── tools/
│   ├── build_gangs.py              HTML списков банд
│   ├── extract_faction_lists.py    JSON каталога из HTML
│   ├── gangs_raw.txt               текст таблиц банд
│   ├── rules_raw.txt               текст Trading Post
│   ├── gang_i18n.py                словарь перевода
│   ├── i18n_*.py                   переводы правил и прозы
│   ├── serve.py                    локальный сервер
│   ├── _qa.py
│   └── deploy/                     установка на Ubuntu и перезапуск
├── rules/                          исходные PDF, в git не входят
├── package.json                    npm start, build и test
├── PRD.md
├── SCENARIOS.md
└── TECH_STACK.md
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

Кампании — отдельные папки `campaigns/<id>/`. Список: `GET /api/campaigns`.
Запись стола: `PUT /api/campaigns/:id`. Ростеры этой кампании:
`/api/campaigns/:id/rosters`. Копия из общих при выборе банды игрока и возврат
в `rosters/` после `POST /api/campaigns/:id/finish`.

---

## Справочник правил

| Файл | Раздел | Источник |
| --- | --- | --- |
| `pages/core-rules.html` | Основные правила | `rules/SKIRMUNDA.pdf` |
| `pages/gangs.html` | 19 списков банд | `rules/GANGS0_3.pdf` |
| `pages/campaign-helper.html` | Подсказка по ведению кампании | SKIRMUNDA |
| `pages/campaign-arbitrator.html` | Стол арбитра, сохраняется в `campaigns/` | SKIRMUNDA |
| `pages/mission-helper.html` | Генерация миссий | SKIRMUNDA |
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
апгрейды) извлекается из уже собранных страниц `pages/gangs/*.html`:

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
