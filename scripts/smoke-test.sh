#!/usr/bin/env bash
# M2 — 라이브 스모크 테스트. deploy.sh 가 호출하며 단독 실행도 가능.
#
# 타겟 URL:
#   - $SMOKE_URL 있으면 그대로 사용 (예: 로컬 http://localhost:3099)
#   - 없으면 SSH journalctl 로 현재 cloudflared quick-tunnel URL 자동 추출
#     (quick tunnel 은 재시작마다 URL 이 바뀌므로 하드코딩 불가)
#
# 점검 (curl, HTTP 200 기대):
#   /research/login · /login · /api/healthz(+ body status=ok) · 정적자원 1건
#
# 종료코드: 모두 통과 0, 하나라도 실패 1.
#
# set -e 미사용 — curl HTTP 5xx 도 요청 자체는 성공(코드 200 아님)이라
# http_code 로 직접 판정한다. 연결 실패는 빈/000 코드 → fail.
set -uo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/lightsail-kdli.pem}"
SERVER="${SERVER:-ubuntu@43.200.92.81}"
TUNNEL_SERVICE="${TUNNEL_SERVICE:-cloudflared-kdli}"

resolve_url() {
  if [[ -n "${SMOKE_URL:-}" ]]; then
    echo "$SMOKE_URL"
    return 0
  fi
  ssh -i "$SSH_KEY" "$SERVER" \
    "sudo journalctl -u $TUNNEL_SERVICE | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1"
}

URL="$(resolve_url)"
URL="${URL%/}" # 끝 슬래시 제거
if [[ -z "$URL" ]]; then
  echo "❌ 타겟 URL 확인 실패 (SMOKE_URL 미설정 + 터널 URL 추출 실패)"
  exit 1
fi
echo "[smoke] target: $URL"

fail=0
check_status() { # $1=path $2=expected_code $3=label
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$URL$1")
  if [[ "$code" == "$2" ]]; then
    echo "✅ $3 ($1) → $code"
  else
    echo "❌ $3 ($1) → ${code:-000} (기대 $2)"
    fail=1
  fi
}

check_status "/research/login" 200 "research-login"
check_status "/login"          200 "login"
check_status "/api/healthz"    200 "healthz"

# healthz 본문 status=ok 확인 (db ping 통과 여부)
hz=$(curl -s --max-time 15 "$URL/api/healthz")
if echo "$hz" | grep -q '"status":"ok"'; then
  echo "✅ healthz body status=ok"
else
  echo "❌ healthz body status≠ok: $hz"
  fail=1
fi

# 정적 자원 1건 (login HTML 에서 /_next/static 경로 추출해 200 확인)
asset=$(curl -s --max-time 15 "$URL/login" | grep -oE '/_next/static/[^"]+' | head -1)
if [[ -n "$asset" ]]; then
  check_status "$asset" 200 "static-asset"
else
  echo "⚠️ 정적 자원 경로 추출 실패 — 스킵 (치명 아님)"
fi

if [[ "$fail" == 0 ]]; then
  echo "[smoke] ✅ PASS"
  exit 0
else
  echo "[smoke] ❌ FAIL"
  exit 1
fi
