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
SSH_PASSWORD=""
SSH_PASSWORD_MODE="ask"
EXTRA=()
ASKPASS_FILE=""

usage() {
  awk 'NR>1 && /^set -euo pipefail$/ { exit } NR>1 { sub(/^# ?/, ""); print }' "$0"
}

trim() {
  local s="$1"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}

unquote() {
  local s="$1" n first last
  n=${#s}
  if (( n >= 2 )); then
    first="${s:0:1}"
    last="${s:n-1:1}"
    if [[ "$first" == "$last" && ( "$first" == "'" || "$first" == '"' ) ]]; then
      s="${s:1:n-2}"
    fi
  fi
  printf '%s' "$s"
}

assign_value() {
  local raw="$1" key="$2" val
  val="${raw#"$key"=}"
  val="${val%%#*}"
  unquote "$(trim "$val")"
}

cleanup() {
  if [[ -n "$ASKPASS_FILE" ]]; then
    rm -f "$ASKPASS_FILE"
  fi
}

load_config() {
  local line flag rest
  if [[ ! -f "$CONFIG" ]]; then
    echo "Нет $CONFIG. Скопируйте tools/deploy/remote.local.example и заполните TARGET." >&2
    exit 1
  fi
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="$(trim "$line")"
    [[ -z "$line" || "$line" == \#* ]] && continue
    case "$line" in
      SSH_PASSWORD_MODE=*)
        SSH_PASSWORD_MODE="$(assign_value "$line" SSH_PASSWORD_MODE)"
        SSH_PASSWORD_MODE="$(printf '%s' "$SSH_PASSWORD_MODE" | tr '[:upper:]' '[:lower:]')"
        ;;
      SSH_PASSWORD=*)
        SSH_PASSWORD="$(unquote "$(trim "${line#SSH_PASSWORD=}")")"
        ;;
      TARGET=*) TARGET="$(assign_value "$line" TARGET)" ;;
      SSH_PORT=*) SSH_PORT="$(assign_value "$line" SSH_PORT)" ;;
      --*)
        line="$(trim "${line%%#*}")"
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

trap cleanup EXIT
load_config

case "$SSH_PASSWORD_MODE" in
  ask|prompt) SSH_PASSWORD_MODE="ask" ;;
  file) ;;
  *)
    echo "SSH_PASSWORD_MODE должен быть ask или file, сейчас: $SSH_PASSWORD_MODE" >&2
    exit 1
    ;;
esac

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

if [[ "$SSH_PASSWORD_MODE" == "file" ]]; then
  if [[ -z "$SSH_PASSWORD" ]]; then
    echo "SSH_PASSWORD_MODE=file, но SSH_PASSWORD пуст." >&2
    exit 1
  fi
  ASKPASS_FILE="$(mktemp)"
  chmod 700 "$ASKPASS_FILE"
  printf '%s\n' '#!/bin/sh' "printf '%s\\n' $(printf '%q' "$SSH_PASSWORD")" > "$ASKPASS_FILE"
  chmod +x "$ASKPASS_FILE"
  unset SSH_PASSWORD
fi

echo "Подключаюсь к ${TARGET} и запускаю установку на сервере."
if [[ "$SSH_PASSWORD_MODE" == "file" ]]; then
  SSH_ASKPASS="$ASKPASS_FILE" \
  SSH_ASKPASS_REQUIRE=force \
  DISPLAY="${DISPLAY:-:0}" \
  "${ssh_cmd[@]}" "$TARGET" "$remote"
else
  env -u SSH_ASKPASS -u SSH_ASKPASS_REQUIRE \
    "${ssh_cmd[@]}" "$TARGET" "$remote"
fi
