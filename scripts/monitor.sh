#!/usr/bin/env bash
# M6 — 라이브 모니터링. UptimeRobot 백업으로 노트북 cron 5분 주기 실행.
#
# 목표(AUTOMATION_DESIGN.md M6): 라이브 다운/URL 변경을 본인이 모르게 두지 않기.
#
# 동작:
#   1. 타겟 URL 결정: env KDLI_TUNNEL_URL 있으면 사용,
#      없으면 ./scripts/get-current-tunnel-url.sh 로 현재 URL 자동 발견.
#   2. /research/login · /api/healthz curl → HTTP 200 기대.
#   3. 200 아니면 진단 수집 후 알림:
#      (a) SSH ping (인스턴스 살아있나?)
#      (b) systemctl status cloudflared-kdli (SSH)
#      (c) get-current-tunnel-url.sh 로 새 URL 감지 → 알림에 포함
#   4. send_alert() 단일 함수로 알림(이메일 기본, 미설치 시 로그+stderr 폴백).
#
# set -e 미사용 — curl 5xx/연결실패도 스크립트가 죽지 않고 끝까지 진단·알림해야 함.
#   (transient curl 실패가 알림 전에 크래시 내면 안 됨)
#
# 환경:
#   KDLI_TUNNEL_URL     (옵션) 고정 타겟 URL. 없으면 자동 발견.
#   KDLI_SSH            ubuntu@43.200.92.81
#   KDLI_SSH_KEY        $HOME/.ssh/lightsail-kdli.pem
#   KDLI_TUNNEL_SERVICE cloudflared-kdli
#   KDLI_ALERT_EMAIL    murryjjang@gmail.com
#
# 종료코드: 정상 0, 한 번이라도 알림 발생 1.
#
# 사용(cron 권장):
#   */5 * * * * cd /home/murry/projects/korean-speaking-ai-mvp && ./scripts/monitor.sh >> .monitor/cron.log 2>&1
set -uo pipefail

KDLI_SSH="${KDLI_SSH:-ubuntu@43.200.92.81}"
KDLI_SSH_KEY="${KDLI_SSH_KEY:-$HOME/.ssh/lightsail-kdli.pem}"
KDLI_TUNNEL_SERVICE="${KDLI_TUNNEL_SERVICE:-cloudflared-kdli}"
KDLI_ALERT_EMAIL="${KDLI_ALERT_EMAIL:-murryjjang@gmail.com}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MON_DIR="$ROOT_DIR/.monitor"
mkdir -p "$MON_DIR"

TS="$(date '+%Y-%m-%d %H:%M:%S')"
TS_FILE="$(date '+%Y%m%d-%H%M%S')"

log() { echo "[$TS] $*"; }

# ── 알림 채널(단일 교체 지점) ─────────────────────────────────────────────
# 기본: 로컬 mail/sendmail 있으면 이메일, 없으면 .monitor/alert-<ts>.log + stderr.
# 카카오톡 webhook 으로 바꾸려면 이 함수 본문만 교체하면 됨
#   (예: curl -X POST "$KAKAO_WEBHOOK" -d "text=$body").
send_alert() { # $1=subject $2=body
  local subject="$1" body="$2"
  if command -v mail >/dev/null 2>&1; then
    printf '%s\n' "$body" | mail -s "$subject" "$KDLI_ALERT_EMAIL"
    log "알림 전송: mail → $KDLI_ALERT_EMAIL"
  elif command -v sendmail >/dev/null 2>&1; then
    printf 'To: %s\nSubject: %s\n\n%s\n' "$KDLI_ALERT_EMAIL" "$subject" "$body" \
      | sendmail -t
    log "알림 전송: sendmail → $KDLI_ALERT_EMAIL"
  else
    # 폴백: 로컬 메일러가 없을 때 — 파일에 남기고 stderr 로도 노출.
    local f="$MON_DIR/alert-$TS_FILE.log"
    {
      echo "TO: $KDLI_ALERT_EMAIL"
      echo "SUBJECT: $subject"
      echo "---"
      echo "$body"
    } > "$f"
    log "⚠️ mail/sendmail 미설치 — 알림 파일 기록: $f"
    {
      echo "════════ MONITOR ALERT ($TS) ════════"
      echo "$subject"
      echo "$body"
      echo "═════════════════════════════════════"
    } >&2
  fi
}

# ── HTTP 상태 점검(연결 실패는 000) ───────────────────────────────────────
http_code() { # $1=full-url  → stdout: 3자리 코드(또는 000)
  local c
  c="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$1" 2>/dev/null || true)"
  echo "${c:-000}"
}

# ── 1) 타겟 URL 결정 ──────────────────────────────────────────────────────
TARGET="${KDLI_TUNNEL_URL:-}"
if [[ -z "$TARGET" ]]; then
  log "KDLI_TUNNEL_URL 미설정 — 현재 터널 URL 자동 발견 시도"
  TARGET="$("$SCRIPT_DIR/get-current-tunnel-url.sh" 2>/dev/null || true)"
fi
TARGET="${TARGET%/}"

if [[ -z "$TARGET" ]]; then
  # URL 자체를 못 구함 = 사실상 다운(또는 SSH 불가). 즉시 알림.
  log "❌ 타겟 URL 확인 실패"
  send_alert "[KDLI] 모니터 경보: 터널 URL 확인 불가" \
"시각: $TS
타겟 URL 을 구하지 못했습니다 (KDLI_TUNNEL_URL 미설정 + 자동 발견 실패).
cloudflared 가 죽었거나 SSH 불가 가능성. 런북(docs/ops/MONITORING.md '사고 대응') 참고."
  exit 1
fi

log "타겟: $TARGET"

# ── 2) HTTP 점검 ──────────────────────────────────────────────────────────
CODE_LOGIN="$(http_code "$TARGET/research/login")"
CODE_HEALTH="$(http_code "$TARGET/api/healthz")"
log "/research/login → $CODE_LOGIN | /api/healthz → $CODE_HEALTH"

if [[ "$CODE_LOGIN" == "200" && "$CODE_HEALTH" == "200" ]]; then
  log "✅ 정상"
  exit 0
fi

# ── 3) 비정상 → 진단 수집 ─────────────────────────────────────────────────
log "❌ 비정상 감지 — 진단 수집"

# (a) 인스턴스 살아있나? (SSH echo ok)
PING_RESULT="$(ssh -i "$KDLI_SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes \
  "$KDLI_SSH" 'echo ok' 2>/dev/null || true)"
if [[ "$PING_RESULT" == "ok" ]]; then
  INSTANCE="살아있음 (SSH 응답 ok)"
else
  INSTANCE="❌ SSH 응답 없음 — 인스턴스 다운 또는 네트워크 문제 가능"
fi
log "인스턴스: $INSTANCE"

# (b) cloudflared 서비스 상태
CF_STATUS="$(ssh -i "$KDLI_SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes \
  "$KDLI_SSH" "systemctl status '$KDLI_TUNNEL_SERVICE' --no-pager -l 2>&1 | head -20" \
  2>/dev/null || true)"
[[ -z "$CF_STATUS" ]] && CF_STATUS="(상태 조회 실패 — SSH 불가 가능)"

# (c) 새 터널 URL 감지 (URL 이 바뀌어 옛 URL 만 보던 경우 흔함)
NEW_URL="$("$SCRIPT_DIR/get-current-tunnel-url.sh" 2>/dev/null || true)"
NEW_URL="${NEW_URL%/}"
if [[ -n "$NEW_URL" && "$NEW_URL" != "$TARGET" ]]; then
  URL_NOTE="⚠️ 새 터널 URL 감지: $NEW_URL
   → UptimeRobot 모니터 URL 갱신 + P060-P066 공지 필요."
elif [[ -n "$NEW_URL" ]]; then
  URL_NOTE="현재 터널 URL: $NEW_URL (타겟과 동일 — URL 변경 아님, 서비스 자체 이상으로 추정)"
else
  URL_NOTE="❌ 현재 터널 URL 추출 실패 (cloudflared 다운 가능)."
fi
log "URL: $URL_NOTE"

# ── 4) 알림 ───────────────────────────────────────────────────────────────
send_alert "[KDLI] 모니터 경보: 라이브 비정상" \
"시각: $TS
타겟: $TARGET
  /research/login → $CODE_LOGIN (기대 200)
  /api/healthz    → $CODE_HEALTH (기대 200)

[진단]
- 인스턴스: $INSTANCE
- $URL_NOTE

[cloudflared 상태]
$CF_STATUS

[대응] docs/ops/MONITORING.md '사고 대응 런북' 참고:
  ssh -i $KDLI_SSH_KEY $KDLI_SSH
  sudo systemctl restart $KDLI_TUNNEL_SERVICE
  ./scripts/get-current-tunnel-url.sh   # 새 URL → P060-P066 공지"

exit 1
