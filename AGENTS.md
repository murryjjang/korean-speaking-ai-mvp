<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 트러블슈팅 — 자주 발생하는 dev 환경 이슈

### 페이지가 갑자기 404로 뜨거나, 변경한 게 반영 안 됨
원인: `.next` 빌드 캐시 stale.

해결:
```bash
# dev 서버 종료 (Ctrl+C)
rm -rf .next
npm run dev
```

`.next`는 Next.js 자동 생성 빌드 캐시 폴더. 삭제해도 코드 손실 없음.

### proxy.ts (미들웨어) 변경이 반영 안 됨
원인: proxy/middleware는 hot reload 안 됨.
해결: dev 서버 완전 종료 후 재시작.

### Pretendard 폰트가 로드 안 되고 시스템 폰트로 보임
원인: jsdelivr CDN 일시 장애.
해결: 잠시 후 재시도. 장기적으로 self-host 검토 (TODO).

### 학생/교수자/관리자 로그인 후 엉뚱한 화면으로 가는 것 같음
원인: 브라우저 이전 세션 쿠키 유지.
해결: 시크릿 창 새로 열기, 또는 쿠키 삭제 후 재로그인.

### Supabase 데이터가 비어 있는 것 같음
확인:
```bash
grep -c "^NEXT_PUBLIC_SUPABASE_URL=." .env.local
```
해결: Supabase 대시보드에서 키 확인 후 `.env.local` 갱신.
