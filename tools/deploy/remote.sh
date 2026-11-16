#!/usr/bin/env bash
# Запуск со своего компьютера: по SSH ставит Necromunda Digital на Ubuntu 22.04.
#
# Параметры лежат в tools/deploy/remote.local (см. remote.local.example).
#   cp tools/deploy/remote.local.example tools/deploy/remote.local
#   bash tools/deploy/remote.sh
#
# На сервере нужны SSH и sudo. Скрипт установки скачивается с GitHub
# и сам клонирует репозиторий.

set -euo pipefail

URL="https://raw.githubusercontent.com/dmitrriykriv/necromunda-digital/main/tools/deploy/install-ubuntu.sh"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG="$ROOT/remote.local"
SSH_PORT=""
TARGET=""
EXTRA=()

usage() {
  awk 'NR>1 && /^set -euo pipefail$/ { exit } NR>1 { sub(/^# ?/, ""); print }' "$0"
}

trim() {
  local s="$1"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}

load_config() {
  local line flag rest
  if [[ ! -f "$CONFIG" ]]; then
    echo "Нет $CONFIG. Скопируйте tools/deploy/remote.local.example и заполните TARGET." >&2
    exit 1
  fi
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="$(trim "$line")"
    [[ -z "$line" ]] && continue
    case "$line" in
      TARGET=*) TARGET="$(trim "${line#TARGET=}")" ;;
      SSH_PORT=*) SSH_PORT="$(trim "${line#SSH_PORT=}")" ;;
      --*)
        flag="${line%%[[:space:]]*}"
        rest="$(trim "${line#"$flag"}")"
        EXTRA+=("$flag")
        if [[ -n "$rest" ]]; then
          EXTRA+=("$rest")
        fi
        ;;
      *)
        echo "Не понял строку в $CONFIG: $line" >&2
        exit 1
        ;;
    esac
  done < "$CONFIG"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    *) echo "Аргументы задаются в tools/deploy/remote.local, не в командной строке: $1" >&2; exit 1 ;;
  esac
done

load_config

if [[ -z "$TARGET" ]]; then
  echo "В $CONFIG нет TARGET. Пример: TARGET=user@203.0.113.10" >&2
  exit 1
fi

if ! command -v ssh >/dev/null 2>&1; then
  echo "Не найден ssh. На Windows он входит в OpenSSH Client." >&2
  exit 1
fi

quoted=""
if [[ ${#EXTRA[@]} -gt 0 ]]; then
  quoted="$(printf ' %q' "${EXTRA[@]}")"
fi
url_q="$(printf '%q' "$URL")"

remote="curl -fsSL ${url_q} -o /tmp/necromunda-install.sh && sudo bash /tmp/necromunda-install.sh${quoted}"

ssh_cmd=(ssh -t)
if [[ -n "$SSH_PORT" && "$SSH_PORT" != "22" ]]; then
  ssh_cmd+=(-p "$SSH_PORT")
fi

echo "Подключаюсь к ${TARGET} и запускаю установку на сервере."
"${ssh_cmd[@]}" "$TARGET" "$remote"
