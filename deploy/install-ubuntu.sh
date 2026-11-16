#!/usr/bin/env bash
# Развёртывание Necromunda Digital на Ubuntu 22.04.
#
# Ставит Node.js 22, зависимости, собирает фронтенд и запускает Express
# через systemd. По умолчанию nginx принимает HTTP на порту 80 и проксирует
# на приложение (127.0.0.1:8000).
#
# Скрипт сам клонирует репозиторий в /opt/necromunda.
# Повторный запуск подтягивает новые коммиты с GitHub и перезапускает сервис.
# Каталог rosters/ на сервере не затирается: там лежат сохранённые банды.
#
# Запуск на сервере (скрипт можно скачать отдельно, репозиторий он заберёт сам):
#   curl -fsSL -o install-ubuntu.sh \
#     https://raw.githubusercontent.com/dmitrriykriv/necromunda-digital/main/deploy/install-ubuntu.sh
#   sudo bash install-ubuntu.sh
#
# Если репозиторий уже склонирован:
#   sudo bash /opt/necromunda/deploy/install-ubuntu.sh
#
# Параметры:
#   --repo URL       адрес Git (по умолчанию github.com/dmitrriykriv/necromunda-digital)
#   --branch NAME    ветка (по умолчанию main)
#   --dir PATH       каталог приложения (по умолчанию /opt/necromunda)
#   --user NAME      системный пользователь (по умолчанию necromunda)
#   --port N         порт приложения (по умолчанию 8000)
#   --domain NAME    server_name nginx (по умолчанию _)
#   --no-nginx       без nginx, приложение слушает 0.0.0.0:PORT
#   --no-ufw         не трогать файрвол (нужно, если SSH слушает не 22 порт)
#
# Node.js: по умолчанию мажорная версия 22. Переопределение: NODE_MAJOR=24
#
# HTTPS отдельно, когда DNS уже указывает на этот сервер:
#   sudo apt-get install -y certbot python3-certbot-nginx
#   sudo certbot --nginx -d example.com

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/dmitrriykriv/necromunda-digital.git}"
BRANCH="${BRANCH:-main}"
APP_USER="necromunda"
APP_DIR="/opt/necromunda"
PORT="8000"
DOMAIN="_"
WITH_NGINX=1
WITH_UFW=1
NODE_MAJOR="${NODE_MAJOR:-22}"
SERVICE_NAME="necromunda"
ORIGINAL_ARGS=("$@")

usage() {
  awk 'NR>1 && /^set -euo pipefail$/ { exit } NR>1 { sub(/^# ?/, ""); print }' "$0"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO_URL="${2:?}"; shift 2 ;;
    --branch) BRANCH="${2:?}"; shift 2 ;;
    --dir) APP_DIR="${2:?}"; shift 2 ;;
    --user) APP_USER="${2:?}"; shift 2 ;;
    --port) PORT="${2:?}"; shift 2 ;;
    --domain) DOMAIN="${2:?}"; shift 2 ;;
    --no-nginx) WITH_NGINX=0; shift ;;
    --no-ufw) WITH_UFW=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Неизвестный аргумент: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Нужны права root: sudo bash $0" >&2
  exit 1
fi

if [[ ! "$PORT" =~ ^[0-9]+$ ]] || [[ "$PORT" -lt 1 || "$PORT" -gt 65535 ]]; then
  echo "Некорректный порт: $PORT" >&2
  exit 1
fi

if [[ ! -r /etc/os-release ]]; then
  echo "Не найден /etc/os-release, ожидается Ubuntu." >&2
  exit 1
fi
# shellcheck disable=SC1091
source /etc/os-release
if [[ "${ID:-}" != "ubuntu" ]]; then
  echo "Скрипт рассчитан на Ubuntu, обнаружено: ${ID:-unknown}." >&2
  exit 1
fi
if [[ "${VERSION_ID:-}" != "22.04" ]]; then
  echo "Предупреждение: скрипт проверялся на Ubuntu 22.04, сейчас ${VERSION_ID:-unknown}. Продолжаю."
fi

APP_DIR="$(realpath -m "$APP_DIR")"

case "$APP_DIR" in
  /|/opt|/usr|/bin|/sbin|/etc|/var|/home|/root|/tmp)
    echo "Отказ: каталог $APP_DIR слишком общий." >&2
    exit 1
    ;;
esac

export DEBIAN_FRONTEND=noninteractive
export GIT_TERMINAL_PROMPT=0

log() {
  printf '\n==> %s\n' "$*"
}

node_major() {
  local bin="$1"
  "$bin" -p "process.versions.node.split('.')[0]"
}

repo_git() {
  git -c safe.directory="$APP_DIR" -C "$APP_DIR" "$@"
}

sync_repository() {
  local roster_backup="" tmp=""
  if [[ -d "$APP_DIR/rosters" ]]; then
    roster_backup="$(mktemp -d)"
    cp -a "$APP_DIR/rosters/." "$roster_backup/"
  fi

  if [[ -d "$APP_DIR/.git" ]]; then
    log "Обновление $REPO_URL ($BRANCH)"
    repo_git remote set-url origin "$REPO_URL"
    repo_git fetch --depth 1 origin "$BRANCH"
    repo_git checkout -f -B "$BRANCH" FETCH_HEAD
  elif [[ ! -d "$APP_DIR" ]] || [[ -z "$(ls -A "$APP_DIR" 2>/dev/null || true)" ]]; then
    log "Клонирование $REPO_URL ($BRANCH)"
    rm -rf "$APP_DIR"
    mkdir -p "$(dirname "$APP_DIR")"
    git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  else
    log "В $APP_DIR нет .git, заменяю каталог клоном и возвращаю rosters/"
    tmp="$(mktemp -d)"
    git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$tmp/repo"
    rm -rf "$APP_DIR"
    mkdir -p "$(dirname "$APP_DIR")"
    mv "$tmp/repo" "$APP_DIR"
    rm -rf "$tmp"
  fi

  if [[ -n "$roster_backup" ]]; then
    rm -rf "$APP_DIR/rosters"
    mkdir -p "$APP_DIR/rosters"
    cp -a "$roster_backup/." "$APP_DIR/rosters/"
    rm -rf "$roster_backup"
  fi
}

log "Пакеты системы"
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl gnupg git
if [[ "$WITH_NGINX" -eq 1 ]]; then
  apt-get install -y --no-install-recommends nginx
fi
if [[ "$WITH_UFW" -eq 1 ]]; then
  apt-get install -y --no-install-recommends ufw
fi

sync_repository

if [[ ! -f "$APP_DIR/package.json" || ! -f "$APP_DIR/package-lock.json" ]]; then
  echo "В клоне $APP_DIR нет package.json или package-lock.json." >&2
  exit 1
fi

if [[ -f "$APP_DIR/deploy/install-ubuntu.sh" ]]; then
  this_script="$(realpath "$0")"
  cloned_script="$(realpath "$APP_DIR/deploy/install-ubuntu.sh")"
  if [[ "$this_script" != "$cloned_script" ]]; then
    log "Дальше выполняется скрипт из клона"
    exec bash "$cloned_script" "${ORIGINAL_ARGS[@]}"
  fi
fi

if [[ ! -x /usr/bin/node ]] || [[ "$(node_major /usr/bin/node)" -lt 20 ]]; then
  log "Node.js ${NODE_MAJOR}.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

if [[ "$(node_major /usr/bin/node)" -lt 20 ]]; then
  echo "Нужен Node.js 20 или новее, установлен: $(/usr/bin/node -v)" >&2
  exit 1
fi
log "Node $(/usr/bin/node -v), npm $(/usr/bin/npm -v)"

mem_mb="$(awk '/MemTotal/ {print int($2 / 1024)}' /proc/meminfo)"
if [[ "$mem_mb" -lt 1800 ]] && ! swapon --show --noheadings | grep -q .; then
  log "Мало памяти (${mem_mb} МБ), добавляю swap 2 ГБ для сборки фронтенда"
  if [[ ! -f /swapfile ]]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=progress
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile || true
  if ! grep -qE '^/swapfile[[:space:]]' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
fi

if ! id "$APP_USER" >/dev/null 2>&1; then
  log "Пользователь $APP_USER"
  useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
fi

mkdir -p "$APP_DIR/rosters" "$APP_DIR/.npm-cache"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

log "Зависимости и сборка"
runuser -u "$APP_USER" -- /usr/bin/env \
  HOME="$APP_DIR" \
  npm_config_cache="$APP_DIR/.npm-cache" \
  /usr/bin/npm ci --include=dev --prefix "$APP_DIR"
runuser -u "$APP_USER" -- /usr/bin/env \
  HOME="$APP_DIR" \
  npm_config_cache="$APP_DIR/.npm-cache" \
  /usr/bin/npm run build --prefix "$APP_DIR"

if [[ "$WITH_NGINX" -eq 1 ]]; then
  APP_HOST="127.0.0.1"
else
  APP_HOST="0.0.0.0"
fi

log "Сервис systemd"
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=Necromunda Digital
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=HOME=${APP_DIR}
Environment=NODE_ENV=production
Environment=HOST=${APP_HOST}
Environment=PORT=${PORT}
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=3
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

if [[ "$WITH_NGINX" -eq 1 ]]; then
  log "Nginx"
  cat > /etc/nginx/sites-available/necromunda <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    client_max_body_size 4m;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
  rm -f /etc/nginx/sites-enabled/default
  ln -sfn /etc/nginx/sites-available/necromunda /etc/nginx/sites-enabled/necromunda
  nginx -t
  systemctl enable nginx
  systemctl restart nginx
fi

if [[ "$WITH_UFW" -eq 1 ]]; then
  log "Файрвол ufw"
  ufw allow OpenSSH || true
  ufw allow 22/tcp
  if [[ "$WITH_NGINX" -eq 1 ]]; then
    ufw allow 80/tcp
  else
    ufw allow "${PORT}/tcp"
  fi
  ufw --force enable
fi

log "Проверка /api/health"
healthy=0
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null; then
    healthy=1
    break
  fi
  sleep 1
done

if [[ "$healthy" -ne 1 ]]; then
  echo "Сервис не ответил на /api/health. Последние логи:" >&2
  journalctl -u "$SERVICE_NAME" -n 60 --no-pager >&2 || true
  exit 1
fi

echo
echo "Готово."
echo "  Node:     $(/usr/bin/node -v)"
echo "  Ревизия:  $(repo_git rev-parse --short HEAD) ($BRANCH)"
echo "  Каталог:  $APP_DIR"
echo "  Сервис:   systemctl status $SERVICE_NAME"
echo "  Логи:     journalctl -u $SERVICE_NAME -f"
if [[ "$WITH_NGINX" -eq 1 ]]; then
  if [[ "$DOMAIN" == "_" ]]; then
    echo "  Сайт:     http://<IP-сервера>/"
  else
    echo "  Сайт:     http://${DOMAIN}/"
  fi
else
  echo "  Сайт:     http://<IP-сервера>:${PORT}/"
fi
echo "  Ростеры:  $APP_DIR/rosters (при обновлении не перезаписываются)"
