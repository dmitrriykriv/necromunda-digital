# -*- coding: utf-8 -*-
"""Локальный сервер справочника: раздаёт HTML и пишет ростеры в папку rosters/.

Запуск из корня проекта:
    python tools/serve.py
Затем открыть http://127.0.0.1:8000/

Построитель ростера переведён на Node (React + Express). Для него:
    npm run dev
"""
import json
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
ROSTERS = ROOT / 'rosters'
HOST = '127.0.0.1'
PORT = 8000

SLUG_RE = re.compile(r'[^a-z0-9\-]+')


def slug(text):
    trans = str.maketrans({
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    })
    s = (text or '').lower().translate(trans)
    s = SLUG_RE.sub('-', s).strip('-') or 'roster'
    return s[:60]


def fighter_cost(fighter):
    base = int(fighter.get('baseCost') or 0)
    gear = sum(int(item.get('cost') or 0) for item in fighter.get('equipment') or [])
    return base + gear


def gang_rating(roster):
    return sum(fighter_cost(f) for f in roster.get('fighters') or [])


def rebuild_index():
    items = []
    for path in sorted(ROSTERS.glob('*.json')):
        if path.name == 'index.json':
            continue
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
        except (OSError, json.JSONDecodeError):
            continue
        items.append({
            'file': path.name,
            'id': data.get('id') or path.stem,
            'name': data.get('name') or path.stem,
            'faction': data.get('faction') or '',
            'factionName': data.get('factionName') or '',
            'rating': gang_rating(data),
        })
    index = {'rosters': items}
    ROSTERS.mkdir(exist_ok=True)
    (ROSTERS / 'index.json').write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return index


def safe_name(name):
    name = unquote(name or '').rsplit('/', 1)[-1]
    if not name.endswith('.json'):
        name += '.json'
    if name == 'index.json' or '..' in name or '/' in name or '\\' in name:
        return None
    return name


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get('Content-Length') or 0)
        raw = self.rfile.read(length) if length else b'{}'
        return json.loads(raw.decode('utf-8'))

    def do_GET(self):
        path = self.path.split('?', 1)[0]
        if path == '/api/rosters':
            self._json(200, rebuild_index())
            return
        if path in ('/favicon.svg', '/favicon.ico'):
            self.path = '/pages/favicon.svg'
        super().do_GET()

    def do_PUT(self):
        path = self.path.split('?', 1)[0]
        if path != '/api/rosters':
            self.send_error(404)
            return
        try:
            roster = self._read_json()
        except json.JSONDecodeError:
            self._json(400, {'error': 'Некорректный JSON'})
            return
        roster_id = slug(roster.get('id') or roster.get('name') or 'roster')
        roster['id'] = roster_id
        dest = ROSTERS / ('%s.json' % roster_id)
        dest.write_text(
            json.dumps(roster, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        index = rebuild_index()
        self._json(200, {'ok': True, 'file': dest.name, 'id': roster_id, 'index': index})

    def do_DELETE(self):
        path = self.path.split('?', 1)[0]
        prefix = '/api/rosters/'
        if not path.startswith(prefix):
            self.send_error(404)
            return
        name = safe_name(path[len(prefix):])
        if not name:
            self._json(400, {'error': 'Некорректное имя файла'})
            return
        dest = ROSTERS / name
        if dest.exists():
            dest.unlink()
        self._json(200, {'ok': True, 'index': rebuild_index()})

    def log_message(self, fmt, *args):
        sys.stderr.write('[%s] %s\n' % (self.log_date_time_string(), fmt % args))


def main():
    ROSTERS.mkdir(exist_ok=True)
    rebuild_index()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print('Справочник:  http://%s:%d/' % (HOST, PORT))
    print('Ростеры:     http://%s:%d/pages/roster-builder.html' % (HOST, PORT))
    print('Папка JSON:  %s' % ROSTERS)
    print('Остановка:   Ctrl+C')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nОстановлен.')


if __name__ == '__main__':
    main()
