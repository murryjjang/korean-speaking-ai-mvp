#!/usr/bin/env bash
# M6 — 현재 cloudflared quick-tunnel URL 빠른 확인.
#
# 배경: quick tunnel 은 cloudflared 재시작마다 URL 이 바뀌므로 하드코딩 불가.
#   본인이 현재 URL 을 잊었거나 monitor.sh 가 새 URL 을 감지할 때 호출한다.
#
# 동작: SSH 로 인스턴스의 cloudflared 저널을 파싱해 최신 trycloudflare.com URL 만 추출.
#   성공 시 stdout 에 URL 1줄만 출력(다른 출력 없음 — 다른 스크립트가 캡처해 쓰기 위함).
#
# 환경(상단 env 로 오버라이드 가능):
#   KDLI_SSH            ubuntu@43.200.92.81
#   KDLI_SSH_KEY        $HOME/.ssh/lightsail-kdli.pem
#   KDLI_TUNNEL_SERVICE cloudflared-kdli
#
# 종료코드: URL 추출 성공 0, 실패 1(stderr 메시지).
#
# 사용:
#   ./scripts/get-current-tunnel-url.sh
#   URL="$(./scripts/get-current-tunnel-url.sh)"
set -euo pipefail

KDLI_SSH="${KDLI_SSH:-ubuntu@43.200.92.81}"
KDLI_SSH_KEY="${KDLI_SSH_KEY:-$HOME/.ssh/lightsail-kdli.pem}"
KDLI_TUNNEL_SERVICE="${KDLI_TUNNEL_SERVICE:-cloudflared-kdli}"

# 저널 최근 200줄에서 trycloudflare.com URL 중 가장 마지막(=최신) 1건만 추출.
url="$(ssh -i "$KDLI_SSH_KEY" "$KDLI_SSH" \
  "sudo journalctl -u '$KDLI_TUNNEL_SERVICE' -n 200 \
     | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' \
     | tail -1" 2>/dev/null || true)"

url="${url%/}" # 끝 슬래시 제거

if [[ -z "$url" ]]; then
  echo "❌ 터널 URL 추출 실패 — $KDLI_TUNNEL_SERVICE 저널에 trycloudflare URL 이 없거나 SSH 실패" >&2
  exit 1
fi

echo "$url"
