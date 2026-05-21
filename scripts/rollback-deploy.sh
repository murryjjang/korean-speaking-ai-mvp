#!/usr/bin/env bash
# M2 — 직전 배포 롤백. 서버 .next.bak(직전 빌드 스냅샷) → .next 복원 + 앱 재시작.
# deploy.sh 가 smoke 실패 시 자동 호출하며, 수동 실행도 가능.
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/lightsail-kdli.pem}"
SERVER="${SERVER:-ubuntu@43.200.92.81}"
APP_DIR="${APP_DIR:-/home/ubuntu/korean-speaking-ai-mvp}"
SERVICE="${SERVICE:-kdli-mvp}"

echo "[rollback] $SERVER:$APP_DIR  (.next.bak → .next)"

ssh -i "$SSH_KEY" "$SERVER" "
  set -e
  cd '$APP_DIR'
  if [ ! -d .next.bak ]; then
    echo '❌ .next.bak 없음 — 복원할 직전 빌드가 없습니다. 롤백 불가.'
    exit 1
  fi
  # 현재(실패한) .next 는 .next.failed 로 잠시 보존(디버깅용).
  rm -rf .next.failed 2>/dev/null || true
  [ -d .next ] && mv .next .next.failed
  # 하드링크 복사(무중단·빠름), 미지원 시 일반 복사.
  cp -al .next.bak .next 2>/dev/null || cp -r .next.bak .next
  sudo systemctl restart $SERVICE
  echo '✅ 롤백 복원 + 재시작 완료 (.next.failed 에 실패본 보존)'
"
