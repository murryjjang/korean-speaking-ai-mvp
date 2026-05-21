# 운영 모니터링 (M6)

라이브 다운 / 터널 URL 변경을 **본인이 모르게 두지 않기** 위한 모니터링 구성.

- 1차: **UptimeRobot 무료** (외부에서 5분 간격 ping, 이메일 알림)
- 백업: **노트북 cron** + `scripts/monitor.sh` (UptimeRobot 가 못 잡는 진단/새 URL 감지)

> ⚠️ **현재 구조의 알려진 약점**
> cloudflared **quick tunnel** URL 은 `cloudflared-kdli` 재시작마다 **바뀐다**.
> 따라서 UptimeRobot 에 등록한 URL 도 그때마다 **수동 갱신**해야 한다.
> **영구 해결 = named tunnel + 도메인($10/년)** — 야간 2-3 사이 적용 예정(시연 1주 전 마지노선).

관련 스크립트:
- `scripts/get-current-tunnel-url.sh` — 현재 터널 URL 추출(잊었을 때 / 자동 감지용)
- `scripts/monitor.sh` — cron 백업 모니터(점검 + 진단 + 알림)

---

## (a) UptimeRobot 무료 셋업

1. **현재 터널 URL 확인** (UptimeRobot 에 등록할 주소):
   ```bash
   ./scripts/get-current-tunnel-url.sh
   # 예: https://drove-explore-barbara-collapse.trycloudflare.com  (※ 매번 바뀜)
   ```
2. https://uptimerobot.com 무료 가입 → **Add New Monitor**
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `KDLI live`
   - URL: 위에서 얻은 `https://<현재URL>/research/login`
     (또는 `https://<현재URL>/api/healthz` — 헬스 엔드포인트라 더 가벼움)
   - **Monitoring Interval: 5분** (무료 플랜 최소 간격)
3. **Alert Contacts**: 이메일 추가 → **murryjjang@gmail.com**
   - 새 모니터에 해당 contact 체크
4. **Create Monitor** 저장.

> 🔴 **재시작 때마다 할 일**: `cloudflared-kdli` 가 재시작되면 URL 이 바뀐다.
> 이때 UptimeRobot 모니터의 URL 을 **수동으로 새 URL 로 교체**해야 한다
> (안 하면 옛 URL 404/연결실패로 오탐 알림이 계속 온다).
> 새 URL 은 `./scripts/get-current-tunnel-url.sh` 로 즉시 확인.
> → 이 수동 작업이 싫으면 **named tunnel(영구 URL)** 로 전환(야간 2-3).

---

## (b) 노트북 cron 백업

UptimeRobot 외에 노트북에서도 5분마다 `scripts/monitor.sh` 를 돌려
**진단 정보 수집 + 새 터널 URL 자동 감지**까지 한다(UptimeRobot 는 단순 ping 만).

1. crontab 편집:
   ```bash
   crontab -e
   ```
2. 아래 한 줄 추가(5분 간격, 로그는 `.monitor/cron.log` 누적):
   ```cron
   */5 * * * * cd /home/murry/projects/korean-speaking-ai-mvp && ./scripts/monitor.sh >> .monitor/cron.log 2>&1
   ```
3. 등록 확인:
   ```bash
   crontab -l
   ```
4. 수동 1회 검증(즉시 실행해 동작 확인):
   ```bash
   cd /home/murry/projects/korean-speaking-ai-mvp && ./scripts/monitor.sh; echo "exit=$?"
   # 정상이면 exit=0, 비정상 알림 발생 시 exit=1
   tail -n 20 .monitor/cron.log
   ```

> 노트북이 꺼져 있으면 cron 은 안 돈다 → 그래서 **외부 UptimeRobot 이 1차**, cron 은 백업.

---

## (c) 알림 채널

- **기본: 이메일** → `murryjjang@gmail.com` (env `KDLI_ALERT_EMAIL` 로 변경 가능)
- `monitor.sh` 의 알림은 단일 함수 `send_alert()` 가 담당하며 다음 순서로 동작:
  1. 로컬에 `mail` 있으면 → `mail -s` 로 발송
  2. 없고 `sendmail` 있으면 → `sendmail -t`
  3. 둘 다 없으면 **폴백**: `.monitor/alert-<timestamp>.log` 파일 기록 + stderr(=cron.log) 출력

### 로컬 mail 설정(이메일 실제 발송하려면)
```bash
sudo apt-get install -y mailutils      # Debian/Ubuntu(WSL 포함)
# Gmail 등 외부로 보내려면 SMTP relay(예: msmtp) 설정이 추가로 필요할 수 있음.
```
- `mail` 미설정이어도 **알림은 유실되지 않음** — 폴백 경로:
  - 파일: `.monitor/alert-<timestamp>.log`
  - 표준에러 → cron 로그 `.monitor/cron.log`
- **카카오톡 등으로 교체**: `send_alert()` 함수 본문만 webhook 호출로 바꾸면 됨
  (예: `curl -X POST "$KAKAO_WEBHOOK" -d "text=$body"`). 다른 코드 수정 불필요.

---

## (d) 사고 대응 런북

알림이 왔거나 라이브가 안 열릴 때:

1. **현재 상태 빠르게 확인**
   ```bash
   ./scripts/get-current-tunnel-url.sh   # 새 URL 나오나?
   ```
   - 새 URL 이 **나옴** → URL 만 바뀐 것. 4번(공지)으로.
   - **안 나옴** → cloudflared 다운 의심. 2번으로.

2. **인스턴스 진입**
   ```bash
   ssh -i ~/.ssh/lightsail-kdli.pem ubuntu@43.200.92.81
   ```

3. **cloudflared 재시작** (인스턴스 안에서)
   ```bash
   systemctl status cloudflared-kdli --no-pager -l   # 죽었는지 확인
   sudo systemctl restart cloudflared-kdli
   journalctl -u cloudflared-kdli -n 100 | grep trycloudflare   # 새 URL 확인
   ```
   - 앱(kdli-mvp) 자체 문제로 보이면:
     ```bash
     sudo systemctl restart kdli-mvp
     ```

4. **새 URL 공지 (P060–P066)**
   - 노트북에서:
     ```bash
     ./scripts/get-current-tunnel-url.sh
     ```
   - 얻은 새 URL 을 **P060–P066** 참가자에게 공지.
   - **UptimeRobot 모니터 URL** 도 새 URL 로 갱신((a) 참고).

5. **검증**
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' "<새URL>/api/healthz"   # 200 확인
   ./scripts/monitor.sh; echo "exit=$?"                              # exit=0 이면 회복
   ```

> 반복 재발 시 **named tunnel(영구 URL) 전환**이 근본 해결(약점 항목 참고).
