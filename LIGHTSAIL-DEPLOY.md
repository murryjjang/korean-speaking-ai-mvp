# KDLI Korean MVP — AWS Lightsail 운영 매뉴얼

**작성일:** 2026-05-20 · **작성:** Claude Code
**대상:** feat/q4-llm-provider (배포 커밋 `da43379`)

---

## 1. 인프라 요약

| 항목 | 값 |
|---|---|
| 클라우드 | AWS Lightsail, **Seoul (ap-northeast-2)** |
| 인스턴스 스펙 | Ubuntu 24.04.4 LTS, 2 vCPU, **RAM ~512MB**, 20GB SSD |
| Static IP | **43.200.92.81** |
| Swap | 2GB (`/swapfile`, `/etc/fstab` 등록 — 부팅 시 자동) |
| 방화벽(ufw) | **SSH 22만 허용** (터널은 outbound라 80/443 불필요) |
| Node / npm | v20.20.2 / 10.8.2 (노트북과 동일) |
| 앱 경로 | `/home/ubuntu/korean-speaking-ai-mvp` |
| 환경변수 | `/home/ubuntu/korean-speaking-ai-mvp/.env.production` (perms 600, 22개 키) |

### SSH 접속
```bash
ssh -i ~/.ssh/lightsail-kdli.pem ubuntu@43.200.92.81
```
SSH 키 원본: 노트북 `~/.ssh/lightsail-kdli.pem` (Lightsail 기본키, chmod 600).

---

## 2. systemd 서비스

| 서비스 | 유닛 파일 | 역할 |
|---|---|---|
| `kdli-mvp` | `/etc/systemd/system/kdli-mvp.service` | Next.js 앱 (`next start`, 포트 3000) |
| `cloudflared-kdli` | `/etc/systemd/system/cloudflared-kdli.service` | cloudflared quick tunnel → localhost:3000 |

둘 다 `Restart=always`, 부팅 자동가동(`enabled`).

```bash
# 상태 확인
systemctl status kdli-mvp cloudflared-kdli
systemctl is-active kdli-mvp cloudflared-kdli

# 재시작 (앱만 — 터널 URL 안 바뀜)
sudo systemctl restart kdli-mvp

# 로그 실시간
journalctl -u kdli-mvp -f
journalctl -u cloudflared-kdli -f
```

---

## 3. ⚠️ 터널 URL — quick tunnel의 약점

현재 **임시(quick) 터널**이라 **cloudflared가 재시작/리부팅될 때마다 URL이 바뀝니다.**
- 앱(`kdli-mvp`)만 재시작하면 URL 유지됨 ✅
- `cloudflared-kdli` 재시작 또는 **인스턴스 리부팅** 시 → **새 URL 발급** → 참여자 재공지 필요 ⚠️

### 현재 터널 URL 확인 방법
```bash
sudo journalctl -u cloudflared-kdli | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1
```

### 근본 해결 (권장, 나중에)
Cloudflare 계정 + 도메인으로 **named tunnel**을 만들면 URL이 영구 고정되어 리부팅에도 안 바뀜. 현재는 사용자가 "1회 URL 변경 허용"을 선택해 quick tunnel 유지 중.

---

## 4. 🔧 코드 업데이트 절차 (중요 — 빌드는 노트북에서)

> **512MB RAM에서는 `next build`가 swap을 심하게 쓰며 사실상 불가(이번에도 37분 후 중단).
> 그래서 빌드는 노트북에서 하고 `.next`만 서버로 rsync 합니다.**

```bash
# ── 1) 노트북에서 ──────────────────────────────
cd ~/projects/korean-speaking-ai-mvp
# (코드 수정 후) 커밋 & 푸시
git add -A && git commit -m "..." && git push origin feat/q4-llm-provider

# 프로덕션 빌드
rm -rf .next && npm run build

# ── 2) 서버 코드 동기화 ────────────────────────
ssh -i ~/.ssh/lightsail-kdli.pem ubuntu@43.200.92.81 \
  'cd ~/korean-speaking-ai-mvp && git pull'
#   ↑ package.json 변경 시: 위 명령에 ' && npm ci' 추가

# ── 3) 빌드 산출물 전송 (노트북에서) ───────────
cd ~/projects/korean-speaking-ai-mvp
rsync -az --delete -e "ssh -i ~/.ssh/lightsail-kdli.pem" \
  .next/ ubuntu@43.200.92.81:/home/ubuntu/korean-speaking-ai-mvp/.next/

# ── 4) 서버 앱 재시작 ──────────────────────────
ssh -i ~/.ssh/lightsail-kdli.pem ubuntu@43.200.92.81 \
  'sudo systemctl restart kdli-mvp'
```

`.env.production` 변경 시: 노트북에서 수정 후 `scp`로 전송 → `sudo systemctl restart kdli-mvp`.
```bash
scp -i ~/.ssh/lightsail-kdli.pem .env.production \
  ubuntu@43.200.92.81:/home/ubuntu/korean-speaking-ai-mvp/.env.production
```

### ⚠️ 노트북 OFF 관련
빌드를 노트북에 의존하므로, 노트북을 영구히 끄려면 둘 중 하나 필요:
- **(A)** 업데이트 시에만 Lightsail 인스턴스를 1–2GB로 잠시 resize → 서버에서 직접 `npm run build` → 다시 $5로 복귀
- **(B)** GitHub Actions에서 빌드 → 산출물 배포 (CI 구성)
- **(C)** named tunnel 전환과 함께 더 큰 인스턴스로 이전

운영(서빙)만 한다면 노트북 OFF 무방. 빌드(코드 변경 반영)할 때만 위가 필요.

---

## 5. 환경변수 (.env.production)

`.env.local`을 복사 + 아래 1개 추가 (총 22개 키):
```
FREE_CONVERSATION_STT_PROVIDER=gpt-4o-mini-transcribe   # 추가됨 (자유 대화 STT)
STT_VERBATIM_PROMPT_ENABLED=true                        # 유지
```
나머지(OpenAI/Azure/Supabase 키, provider 플래그 등)는 노트북 `.env.local`과 동일.
> 참고: 노트북 `.env.local`에는 `FREE_CONVERSATION_STT_PROVIDER`가 없어 자유 대화 STT가 `STT_PROVIDER=openai`로 동작 중. 프로덕션은 플랜대로 `gpt-4o-mini-transcribe`로 명시함(동작 차이 있음).

---

## 6. 검증 결과 (2026-05-20)

| 항목 | 결과 |
|---|---|
| vitest (노트북) | **1173 통과 / 0 실패** |
| 로컬 프로덕션 빌드 | 성공, `.next` rsync → 서버 BUILD_ID 일치 |
| 서버 런타임 부팅 | `Next.js 16.2.4 Ready in 384ms` |
| 서버 로컬 응답 | `/`·`/login` HTTP 200 |
| systemd `kdli-mvp` | active, 메모리 51.7M |
| 공개 터널 URL | `/login` HTTP 200 |
| 재시작 시뮬레이션 | `restart kdli-mvp` 후 자동 복구, 터널 URL 불변 ✅ |
| **참여자 1명 sanity check** | **⏳ 사용자 확인 대기** (로그인→자유대화→점수, 실계정 필요) |

---

## 7. 컷오버 절차 (노트북 → Lightsail)

> 새 URL 검증 완료 후 진행. 끄는 순간 기존 URL이 죽으므로 참여자 공지와 함께.

```bash
# 노트북에서 quick tunnel 프로세스 종료
pkill -f 'cloudflared tunnel --url'
# (확인) 노트북에 cloudflared 안 떠 있어야 함
pgrep -af cloudflared
```
그 후 참여자(P060–P066)에게 **새 URL** 공지.

---

## 8. 트러블슈팅

| 증상 | 확인/조치 |
|---|---|
| 사이트 502/연결 안 됨 | `systemctl status kdli-mvp` → 죽었으면 `journalctl -u kdli-mvp -n 50` |
| 사이트는 뜨는데 터널 URL이 안 열림 | `systemctl status cloudflared-kdli`, URL 바뀌었는지 §3으로 재확인 |
| 메모리 부족(OOM) | `free -h`로 swap 사용 확인, 무거운 작업(빌드)은 서버에서 금지 |
| 코드 바꿨는데 반영 안 됨 | §4 절차대로 `.next` rsync + `restart kdli-mvp` 했는지 |
| 리부팅 후 참여자 접속 불가 | cloudflared URL이 바뀜 → §3로 새 URL 확인 후 재공지 |
