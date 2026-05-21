#!/usr/bin/env bash
# M2 — 배포 자동화. 노트북 빌드 → 라이브 반영 → smoke → (실패 시 자동 롤백) → e2e.
#
# 환경(LIGHTSAIL-DEPLOY.md): 빌드는 노트북(서버 512MB 라 next build 불가),
#   .next 만 rsync. SSH/경로/서비스명은 상단 env 로 오버라이드 가능.
#
# 게이트 정책 (AUTOMATION_DESIGN.md 결정):
#   - smoke 실패 → 자동 롤백 ON (deterministic, 안전)
#   - e2e 실패  → E2E_GATE_ROLLBACK=0(기본, 야간1) 경고만 / =1(시연 1주 전) 자동 롤백
#
# 사용:
#   ./scripts/deploy.sh                     # 현재 브랜치 배포
#   DEPLOY_NPM_CI=1 ./scripts/deploy.sh     # package.json 변경 시 서버 npm ci 동반
#   E2E_GATE_ROLLBACK=1 ./scripts/deploy.sh # e2e 실패도 자동 롤백 (시연 주간)
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/lightsail-kdli.pem}"
SERVER="${SERVER:-ubuntu@43.200.92.81}"
APP_DIR="${APP_DIR:-/home/ubuntu/korean-speaking-ai-mvp}"
SERVICE="${SERVICE:-kdli-mvp}"
TUNNEL_SERVICE="${TUNNEL_SERVICE:-cloudflared-kdli}"
BRANCH="${BRANCH:-$(git branch --show-current)}"
E2E_GATE_ROLLBACK="${E2E_GATE_ROLLBACK:-0}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "═══════════════════════════════════════════════"
echo " deploy: branch=$BRANCH → $SERVER:$APP_DIR"
echo "═══════════════════════════════════════════════"

# 1) push (서버가 같은 브랜치를 pull 할 수 있게)
git push origin "$BRANCH"

# 2) 서버 소스 동기화 (package.json 변경 시 DEPLOY_NPM_CI=1)
PULL_CMD="cd '$APP_DIR' && git fetch origin && git checkout '$BRANCH' && git pull --ff-only"
if [[ "${DEPLOY_NPM_CI:-0}" == "1" ]]; then PULL_CMD="$PULL_CMD && npm ci"; fi
ssh -i "$SSH_KEY" "$SERVER" "$PULL_CMD"

# 3) 노트북 프로덕션 빌드
echo "[deploy] 노트북 빌드..."
( cd "$ROOT_DIR" && rm -rf .next && npm run build )

# 4) 서버 현재 .next 백업 (cp -al 하드링크 스냅샷 — 무중단·즉시, 미지원 시 cp -r)
ssh -i "$SSH_KEY" "$SERVER" \
  "cd '$APP_DIR' && rm -rf .next.bak && { cp -al .next .next.bak 2>/dev/null || cp -r .next .next.bak; }"

# 5) 빌드 산출물 전송
echo "[deploy] rsync .next →"
rsync -az --delete -e "ssh -i $SSH_KEY" "$ROOT_DIR/.next/" "$SERVER:$APP_DIR/.next/"

# 6) 앱 재시작
ssh -i "$SSH_KEY" "$SERVER" "sudo systemctl restart $SERVICE"
sleep 5

# 7) 현재 터널 URL 1회 확인 (smoke·e2e 공용)
TUNNEL_URL="$(ssh -i "$SSH_KEY" "$SERVER" \
  "sudo journalctl -u $TUNNEL_SERVICE | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1")"
echo "[deploy] tunnel: ${TUNNEL_URL:-(확인 실패)}"

# 8) smoke — 실패 시 자동 롤백 ON
if SMOKE_URL="$TUNNEL_URL" "$SCRIPT_DIR/smoke-test.sh"; then
  echo "[deploy] smoke ✅"
else
  echo "[deploy] ❌ smoke 실패 → 자동 롤백"
  "$SCRIPT_DIR/rollback-deploy.sh"
  exit 1
fi

# 9) e2e (M5) — 라이브. 미구성(M5 이전)이면 스킵. 게이트는 E2E_GATE_ROLLBACK.
if [[ -d "$ROOT_DIR/e2e/scenarios" ]]; then
  echo "[deploy] e2e (live) 실행..."
  if ( cd "$ROOT_DIR" && LIVE_URL="$TUNNEL_URL" npx playwright test --project=live ); then
    echo "[deploy] e2e ✅"
  elif [[ "$E2E_GATE_ROLLBACK" == "1" ]]; then
    echo "[deploy] ❌ e2e 실패 + 게이트 ON → 자동 롤백"
    "$SCRIPT_DIR/rollback-deploy.sh"
    exit 1
  else
    echo "[deploy] ⚠️ e2e 실패 (E2E_GATE_ROLLBACK=0 → 경고만, 배포 유지)"
  fi
else
  echo "[deploy] e2e 미구성(M5 이전) — 스킵"
fi

echo "═══════════════════════════════════════════════"
echo " ✅ deploy 완료 → ${TUNNEL_URL:-?}"
echo "═══════════════════════════════════════════════"
