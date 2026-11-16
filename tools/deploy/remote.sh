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
curl_cmd="curl -fsSL ${url_q} -o /tmp/necromunda-install.sh"
if [[ "$SSH_PASSWORD_MODE" == "file" ]]; then
  remote="${curl_cmd} && sudo -S -p '' bash /tmp/necromunda-install.sh${quoted}"
else
  remote="${curl_cmd} && sudo bash /tmp/necromunda-install.sh${quoted}"
fi

ssh_opts=(
  -o ConnectTimeout=20
  -o ConnectionAttempts=1
  -o NumberOfPasswordPrompts=3
  -o StrictHostKeyChecking=accept-new
)
ssh_cmd=(ssh "${ssh_opts[@]}")
# В режиме file терминал не нужен: иначе sudo снова ждёт пароль и молчит.
if [[ "$SSH_PASSWORD_MODE" != "file" ]]; then
  ssh_cmd+=(-tt)
fi
if [[ -n "$SSH_PORT" && "$SSH_PORT" != "22" ]]; then
  ssh_cmd+=(-p "$SSH_PORT")
fi

sudo_pw=""
if [[ "$SSH_PASSWORD_MODE" == "file" ]]; then
  if [[ -z "$SSH_PASSWORD" ]]; then
    echo "SSH_PASSWORD_MODE=file, но SSH_PASSWORD пуст." >&2
    exit 1
  fi
  ASKPASS_FILE="$(mktemp)"
  chmod 700 "$ASKPASS_FILE"
  printf '%s\n' '#!/bin/sh' "printf '%s\\n' $(printf '%q' "$SSH_PASSWORD")" > "$ASKPASS_FILE"
  chmod +x "$ASKPASS_FILE"
  sudo_pw="$SSH_PASSWORD"
  unset SSH_PASSWORD
fi

run_with_auth() {
  if [[ "$SSH_PASSWORD_MODE" == "file" ]]; then
    SSH_ASKPASS="$ASKPASS_FILE" \
    SSH_ASKPASS_REQUIRE=force \
    DISPLAY="${DISPLAY:-:0}" \
      "$@"
  else
    env -u SSH_ASKPASS -u SSH_ASKPASS_REQUIRE "$@"
  fi
}

report_failure() {
  local code="$1" what="$2"
  if [[ "$code" -eq 255 ]]; then
    echo "${what} не удалось: нет соединения (код 255). Проверьте адрес, порт и пароль SSH." >&2
  else
    echo "${what} завершилось с кодом ${code}. Текст ошибки выше." >&2
  fi
}

if [[ "$SSH_PASSWORD_MODE" == "file" ]]; then
  echo "Подключаюсь к ${TARGET}. Пароль из файла, без запроса. Жду ответ не дольше 20 с."
else
  echo "Подключаюсь к ${TARGET}. Сейчас появится запрос пароля SSH, жду ответ не дольше 20 с."
  echo "Если вход пройдёт, сервер может отдельно спросить пароль sudo."
fi
set +e
echo "Скачиваю установщик с GitHub и запускаю его на ${TARGET}."
if [[ "$SSH_PASSWORD_MODE" == "file" ]]; then
  printf '%s\n' "$sudo_pw" | run_with_auth "${ssh_cmd[@]}" "$TARGET" "$remote"
else
  run_with_auth "${ssh_cmd[@]}" "$TARGET" "$remote"
fi
status=$?
if [[ "$status" -ne 0 ]]; then
  report_failure "$status" "Установка"
fi
set -e
unset sudo_pw
exit "$status"
