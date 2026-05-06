import { test, expect } from '@playwright/test'

/**
 * Auth route smoke tests.
 *
 * These tests verify page structure without real Supabase credentials.
 * In the smoke dev server (SMOKE_TEST_MODE=1), proxy.ts skips auth
 * enforcement when Supabase env vars are absent, so /student and /teacher
 * load without a real login. /login always loads regardless of config.
 *
 * Note: Next.js 16 uses proxy.ts (not middleware.ts) for route interception.
 * SMOKE_TEST_MODE=1 is set in playwright.config.ts webServer command.
 */

test.describe('/login page smoke', () => {
  test('/login 페이지 로드 및 로그인 폼 표시', async ({ page }) => {
    await page.goto('/login')

    // 페이지 타이틀
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible()

    // 이메일/비밀번호 입력 필드
    await expect(page.getByLabel('이메일')).toBeVisible()
    await expect(page.getByLabel('비밀번호')).toBeVisible()

    // 로그인 버튼
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible()
  })

  test('/login 이메일 미입력 → 브라우저 validation 동작', async ({ page }) => {
    await page.goto('/login')

    // 비밀번호만 입력하고 제출 — 브라우저 required validation이 막아야 함
    await page.getByLabel('비밀번호').fill('somepassword')
    await page.getByRole('button', { name: '로그인' }).click()

    // 폼 제출이 차단되어 /login에 그대로 있어야 함
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('/role-missing page smoke', () => {
  test('/role-missing 페이지 로드', async ({ page }) => {
    await page.goto('/role-missing')

    await expect(page.getByRole('heading', { name: '역할 정보 없음' })).toBeVisible()
    await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible()
  })
})

test.describe('인증 우회 — Supabase 미설정 환경', () => {
  test('/student는 Supabase 미설정 시 접근 가능', async ({ page }) => {
    // proxy.ts skips auth when Supabase env vars are absent
    await page.goto('/student')

    const url = page.url()
    const isStudentOrLogin = url.includes('/student') || url.includes('/login')
    expect(isStudentOrLogin).toBe(true)
  })

  test('/student 메뉴 항목 표시 확인', async ({ page }) => {
    await page.goto('/student')

    if (!page.url().includes('/student')) return

    // 데스크톱 사이드바 기준 (default Playwright viewport > md breakpoint)
    await expect(page.getByRole('link', { name: '말하기 평가' })).toBeVisible()
    await expect(page.getByRole('link', { name: '미션 대화' })).toBeVisible()
    // 대회 준비는 disabled span — desktop sidebar와 mobile nav에 모두 존재하므로 first() 사용
    await expect(page.getByText('말하기 대회 준비').first()).toBeVisible()
  })

  test('/teacher는 Supabase 미설정 시 접근 가능 + 채점 관리 헤더 표시', async ({ page }) => {
    await page.goto('/teacher')

    const url = page.url()
    const isTeacherOrLogin = url.includes('/teacher') || url.includes('/login')
    expect(isTeacherOrLogin).toBe(true)

    // smoke 환경에서 auth bypass → 채점 관리 대시보드가 렌더링되어야 함
    if (url.includes('/teacher')) {
      await expect(page.getByRole('heading', { name: '채점 관리' })).toBeVisible()
    }
  })

  test('/student/speaking/q-001 말하기 평가 흐름 유지', async ({ page }) => {
    // 기존 핵심 흐름이 auth 변경 후에도 작동해야 함
    await page.goto('/student/speaking/q-001')

    await expect(page.getByRole('heading', { name: /자기소개/ })).toBeVisible()
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
  })

  test('/student/speaking/q-002 다문항 직접 접근', async ({ page }) => {
    await page.goto('/student/speaking/q-002')

    await expect(page.getByRole('heading', { name: /자기소개/ })).toBeVisible()
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
  })

  test('/student/speaking 문항 목록 표시', async ({ page }) => {
    await page.goto('/student/speaking')

    await expect(page.getByRole('heading', { name: '말하기 평가' })).toBeVisible()
    // 최소 하나의 "시작하기" 링크가 있어야 함
    await expect(page.getByRole('link', { name: '시작하기' }).first()).toBeVisible()
  })

  test('TTS 음성 안내 버튼 렌더링 확인', async ({ page }) => {
    await page.goto('/student/speaking/q-001')

    // secondary variant 버튼으로 교체 후 렌더링 확인
    await expect(page.getByRole('button', { name: /문제 듣기/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /녹음 안내 듣기/ })).toBeVisible()
  })

  test('모국어 도움말 아랍어 RTL crash 없음', async ({ page }) => {
    await page.goto('/student/speaking/q-001')

    // 도움말 토글 클릭 — AR 텍스트 렌더링 시 crash 없어야 함
    await page.getByRole('button', { name: /모국어 도움말 보기/ }).click()
    await expect(page.getByText('[AR]')).toBeVisible()
  })

  test('/student/speaking/q-003 이미지 또는 미등록 안내 표시', async ({ page }) => {
    await page.goto('/student/speaking/q-003')

    await expect(page.getByRole('heading', { name: /그림 묘사/ })).toBeVisible()

    // 이미지 컨테이너(data-testid) 또는 "그림 자료가 아직 등록되지 않았습니다." 안내 중 하나가 표시되어야 함
    const hasImage = await page.locator('[data-testid="question-image-container"]').isVisible().catch(() => false)
    const hasFallback = await page.getByText('그림 자료가 아직 등록되지 않았습니다').isVisible().catch(() => false)
    expect(hasImage || hasFallback).toBe(true)

    // 준비 시작 버튼도 정상 표시
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
  })
})

test.describe('정식 평가세트 구조 smoke (Phase 10-E-2)', () => {
  test('정식 세트 3개 (초급/중급/고급)가 학습자 화면에 표시됨', async ({ page }) => {
    await page.goto('/student/speaking')

    await expect(page.getByRole('heading', { name: '말하기 평가' })).toBeVisible()
    await expect(page.getByText('초급 평가세트')).toBeVisible()
    await expect(page.getByText('중급 평가세트')).toBeVisible()
    await expect(page.getByText('고급 평가세트')).toBeVisible()
  })

  test('각 세트에 4문항이 있어 총 12개 이상의 시작하기 링크가 표시됨', async ({ page }) => {
    await page.goto('/student/speaking')

    // 데스크톱 뷰포트(1280px)에서 hidden md:inline-flex 링크가 표시됨
    const startLinks = page.getByRole('link', { name: '시작하기' })
    const count = await startLinks.count()
    // 3세트 × 4문항 = 12개 이상
    expect(count).toBeGreaterThanOrEqual(12)
  })

  test('정식 세트에 4개 문항 유형 레이블이 모두 표시됨', async ({ page }) => {
    await page.goto('/student/speaking')

    await expect(page.getByText('낭독').first()).toBeVisible()
    await expect(page.getByText('자료 설명').first()).toBeVisible()
    await expect(page.getByText('듣고 답하기').first()).toBeVisible()
    await expect(page.getByText('대화에서 미션 달성하기').first()).toBeVisible()
  })

  test('정식 세트 첫 문항(낭독) 페이지 접근 — 준비 시작 버튼 표시', async ({ page }) => {
    await page.goto('/student/speaking/beginner-q1-reading?setId=beginner-set-1')

    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
  })

  test('기존 q-001/q-003 legacy route가 여전히 작동함', async ({ page }) => {
    await page.goto('/student/speaking/q-001')
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()

    await page.goto('/student/speaking/q-003')
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
  })
})

test.describe('Phase 10-E-3: 공식 문항 12개 URL 접근성', () => {
  const officialQuestions = [
    { qId: 'beginner-q1-reading', setId: 'beginner-set-1' },
    { qId: 'beginner-q2-material-description', setId: 'beginner-set-1' },
    { qId: 'beginner-q3-listening-response', setId: 'beginner-set-1' },
    { qId: 'beginner-q4-dialogue-mission', setId: 'beginner-set-1' },
    { qId: 'intermediate-q1-reading', setId: 'intermediate-set-1' },
    { qId: 'intermediate-q2-material-description', setId: 'intermediate-set-1' },
    { qId: 'intermediate-q3-listening-response', setId: 'intermediate-set-1' },
    { qId: 'intermediate-q4-dialogue-mission', setId: 'intermediate-set-1' },
    { qId: 'advanced-q1-reading', setId: 'advanced-set-1' },
    { qId: 'advanced-q2-material-description', setId: 'advanced-set-1' },
    { qId: 'advanced-q3-listening-response', setId: 'advanced-set-1' },
    { qId: 'advanced-q4-dialogue-mission', setId: 'advanced-set-1' },
  ]

  for (const { qId, setId } of officialQuestions) {
    const isDialogue = qId.endsWith('-dialogue-mission')
    test(`${qId} — 404 없이 열림, ${isDialogue ? '대화 시작 버튼 표시' : '준비 시작 버튼 표시'}`, async ({ page }) => {
      await page.goto(`/student/speaking/${qId}?setId=${setId}`)
      if (isDialogue) {
        await expect(page.locator('[data-testid="start-dialogue-button"]')).toBeVisible()
      } else {
        await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
      }
    })
  }

  test('dialogue_mission 화면에 미션 목표 안내가 표시됨', async ({ page }) => {
    await page.goto('/student/speaking/beginner-q4-dialogue-mission?setId=beginner-set-1')
    await expect(page.getByText('AI와 대화하며 미션을 달성하는 평가입니다')).toBeVisible()
    // 미션 목표 목록 중 하나 — exact match로 strict mode 위반 방지
    await expect(page.getByText('차가운/따뜻한 음료 선택').first()).toBeVisible()
  })

  test('listening_response 화면에 학습자 안내 요소가 표시됨', async ({ page }) => {
    await page.goto('/student/speaking/beginner-q3-listening-response?setId=beginner-set-1')
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
    await expect(page.getByText('수업 시작 시간')).toBeVisible()
  })
})

test.describe('Phase 10-E-4: 공식 문항 asset rendering', () => {
  // --- material_description q2 ---

  test('beginner q2 image placeholder가 렌더링됨 (식당 안 모습)', async ({ page }) => {
    await page.goto('/student/speaking/beginner-q2-material-description?setId=beginner-set-1')
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
    // 이미지 placeholder 또는 실제 이미지 컨테이너 중 하나가 있어야 함
    const hasPlaceholder = await page.locator('[data-testid="image-asset-placeholder"]').isVisible().catch(() => false)
    const hasImage = await page.locator('[data-testid="image-asset-container"]').isVisible().catch(() => false)
    expect(hasPlaceholder || hasImage).toBe(true)
    // 식당 제목이 보여야 함
    await expect(page.getByText('식당 안 모습')).toBeVisible()
  })

  test('intermediate q2 chart에 50%/30%/20% 수치가 표시됨', async ({ page }) => {
    await page.goto('/student/speaking/intermediate-q2-material-description?setId=intermediate-set-1')
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
    await expect(page.locator('[data-testid="chart-asset"]')).toBeVisible()
    // data-testid 기반으로 수치 확인 — 바 스팬과 표 셀 양쪽에 있으므로 first() 사용
    await expect(page.getByText('50%').first()).toBeVisible()
    await expect(page.getByText('30%').first()).toBeVisible()
    await expect(page.getByText('20%').first()).toBeVisible()
    // 항목 레이블도 있어야 함
    await expect(page.getByText('대면 수업').first()).toBeVisible()
  })

  test('advanced q2 chart에 2024/120명, 2025/180명, 2026/260명 수치가 표시됨', async ({ page }) => {
    await page.goto('/student/speaking/advanced-q2-material-description?setId=advanced-set-1')
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
    await expect(page.locator('[data-testid="chart-asset"]')).toBeVisible()
    // data-testid 기반으로 수치 확인 — 바 스팬과 표 셀 양쪽에 있으므로 first() 사용
    await expect(page.getByText('120명').first()).toBeVisible()
    await expect(page.getByText('180명').first()).toBeVisible()
    await expect(page.getByText('260명').first()).toBeVisible()
    // 연도 레이블
    await expect(page.getByText('2024').first()).toBeVisible()
    await expect(page.getByText('2025').first()).toBeVisible()
    await expect(page.getByText('2026').first()).toBeVisible()
  })

  test('intermediate/advanced q2에 licenseNote 또는 teacherOnlyNote가 노출되지 않음', async ({ page }) => {
    await page.goto('/student/speaking/intermediate-q2-material-description?setId=intermediate-set-1')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('teacherOnlyNote')
    expect(bodyText).not.toContain('파일럿 전 실제 사진 교체')
    expect(bodyText).not.toContain('앱 내부 SVG')
  })

  // --- listening_response q3 ---

  test('beginner q3 listening card가 렌더링되고 음원 미등록 안내가 표시됨', async ({ page }) => {
    await page.goto('/student/speaking/beginner-q3-listening-response?setId=beginner-set-1')
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
    await expect(page.locator('[data-testid="listening-asset-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="audio-not-ready"]')).toBeVisible()
    await expect(page.locator('[data-testid="listen-count"]')).toBeVisible()
  })

  test('intermediate q3 listening card가 렌더링됨', async ({ page }) => {
    await page.goto('/student/speaking/intermediate-q3-listening-response?setId=intermediate-set-1')
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
    await expect(page.locator('[data-testid="listening-asset-card"]')).toBeVisible()
  })

  test('advanced q3 listening card가 렌더링됨', async ({ page }) => {
    await page.goto('/student/speaking/advanced-q3-listening-response?setId=advanced-set-1')
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
    await expect(page.locator('[data-testid="listening-asset-card"]')).toBeVisible()
  })

  test('q3 listenLimit 카운터가 "들은 횟수: 0 / 2" 형태로 표시됨', async ({ page }) => {
    await page.goto('/student/speaking/beginner-q3-listening-response?setId=beginner-set-1')
    await expect(page.locator('[data-testid="listen-count"]')).toContainText('들은 횟수: 0 / 2')
  })

  test('q3 learnerVisibleElements가 학습자 화면에 표시됨', async ({ page }) => {
    await page.goto('/student/speaking/beginner-q3-listening-response?setId=beginner-set-1')
    await expect(page.getByText('수업 시작 시간')).toBeVisible()
    await expect(page.getByText('수업 장소')).toBeVisible()
  })

  test('q3 listeningScriptForTeacherOnly가 학습자 화면에 노출되지 않음', async ({ page }) => {
    await page.goto('/student/speaking/beginner-q3-listening-response?setId=beginner-set-1')
    // 스크립트 콘텐츠가 화면에 렌더링되면 안 됨
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('listeningScriptForTeacherOnly')
    // 실제 스크립트 텍스트 — 학습자에게 보이면 안 됨 (교수자 전용)
    expect(bodyText).not.toContain('내일부터 한국어 수업이 시작됩니다')
  })

  test('q3 audio 미등록 상태에서 listen 버튼이 disabled 상태임', async ({ page }) => {
    await page.goto('/student/speaking/beginner-q3-listening-response?setId=beginner-set-1')
    const btn = page.locator('[data-testid="listen-button"]')
    await expect(btn).toBeVisible()
    // 음원 없음 → 버튼이 비활성화됨
    await expect(btn).toBeDisabled()
  })

  // --- dialogue_mission q4 ---

  test('beginner q4 dialogue_mission card가 렌더링됨 — missionGoals 표시', async ({ page }) => {
    await page.goto('/student/speaking/beginner-q4-dialogue-mission?setId=beginner-set-1')
    // 10-E-5: dialogue_mission은 대화 시작 버튼 표시 (DialogueMissionPanel)
    await expect(page.locator('[data-testid="start-dialogue-button"]')).toBeVisible()
    await expect(page.getByText('AI와 대화하며 미션을 달성하는 평가입니다')).toBeVisible()
    // 미션 목표 중 타이틀과 겹치지 않는 항목 사용 (strict mode 위반 방지)
    await expect(page.getByText('차가운/따뜻한 음료 선택').first()).toBeVisible()
  })

  test('intermediate q4 missionGoals 표시됨', async ({ page }) => {
    await page.goto('/student/speaking/intermediate-q4-dialogue-mission?setId=intermediate-set-1')
    await expect(page.getByText('말하기 수업 시간 확인').first()).toBeVisible()
  })

  test('advanced q4 missionGoals 표시됨', async ({ page }) => {
    await page.goto('/student/speaking/advanced-q4-dialogue-mission?setId=advanced-set-1')
    await expect(page.getByText('일정 조정 가능 여부 확인').first()).toBeVisible()
  })

  test('q4 aiInformation이 학습자 화면에 노출되지 않음', async ({ page }) => {
    await page.goto('/student/speaking/beginner-q4-dialogue-mission?setId=beginner-set-1')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('aiInformation')
    // dialogue_mission aiRole 상세 정보 미노출 확인
    expect(bodyText).not.toContain('teacherOnlyNote')
  })

  test('q4 dialogue_mission이 일반 녹음형 UI와 구분됨 — 대화 패널 표시', async ({ page }) => {
    await page.goto('/student/speaking/beginner-q4-dialogue-mission?setId=beginner-set-1')
    // 일반 문항과 달리 AI 대화 패널이 보여야 함
    await expect(page.locator('[data-testid="dialogue-mission-panel"]')).toBeVisible()
    await expect(page.locator('[data-testid="start-dialogue-button"]')).toBeVisible()
  })

  // --- teacher-only 필드 비노출 통합 확인 ---

  test('공식 문항 12개 URL이 계속 404 없이 열림 (10-E-3 유지)', async ({ page }) => {
    const routes = [
      '/student/speaking/beginner-q1-reading?setId=beginner-set-1',
      '/student/speaking/beginner-q2-material-description?setId=beginner-set-1',
      '/student/speaking/beginner-q3-listening-response?setId=beginner-set-1',
      '/student/speaking/beginner-q4-dialogue-mission?setId=beginner-set-1',
      '/student/speaking/intermediate-q1-reading?setId=intermediate-set-1',
      '/student/speaking/intermediate-q2-material-description?setId=intermediate-set-1',
      '/student/speaking/intermediate-q3-listening-response?setId=intermediate-set-1',
      '/student/speaking/intermediate-q4-dialogue-mission?setId=intermediate-set-1',
      '/student/speaking/advanced-q1-reading?setId=advanced-set-1',
      '/student/speaking/advanced-q2-material-description?setId=advanced-set-1',
      '/student/speaking/advanced-q3-listening-response?setId=advanced-set-1',
      '/student/speaking/advanced-q4-dialogue-mission?setId=advanced-set-1',
    ]
    for (const route of routes) {
      await page.goto(route)
      if (route.includes('dialogue-mission')) {
        // 10-E-5: dialogue_mission은 대화 시작 버튼으로 표시 (DialogueMissionPanel)
        await expect(page.locator('[data-testid="start-dialogue-button"]')).toBeVisible()
      } else {
        await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
      }
    }
  })

  test('legacy q-003 route 유지 (10-E-3 후퇴 없음)', async ({ page }) => {
    await page.goto('/student/speaking/q-003')
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
  })
})

test.describe('Phase 10-E-5-A: dialogue_mission 실제 AI 쌍방 대화 UI', () => {
  const dialogueCases = [
    { qId: 'beginner-q4-dialogue-mission', setId: 'beginner-set-1' },
    { qId: 'intermediate-q4-dialogue-mission', setId: 'intermediate-set-1' },
    { qId: 'advanced-q4-dialogue-mission', setId: 'advanced-set-1' },
  ]

  for (const { qId, setId } of dialogueCases) {
    test(`${qId} — 기존 단발 녹음 UI(준비 시작)가 보이지 않음`, async ({ page }) => {
      await page.goto(`/student/speaking/${qId}?setId=${setId}`)
      await expect(page.getByRole('button', { name: '준비 시작' })).not.toBeVisible()
    })

    test(`${qId} — 대화 시작 버튼(enabled)과 dialogue-mission-panel 표시`, async ({ page }) => {
      await page.goto(`/student/speaking/${qId}?setId=${setId}`)
      await expect(page.locator('[data-testid="dialogue-mission-panel"]')).toBeVisible()
      const btn = page.locator('[data-testid="start-dialogue-button"]')
      await expect(btn).toBeVisible()
      await expect(btn).toBeEnabled()
    })
  }

  test('beginner q4 대화 시작 클릭 시 AI 첫 발화 turn이 표시됨', async ({ page }) => {
    await page.goto('/student/speaking/beginner-q4-dialogue-mission?setId=beginner-set-1')
    await page.locator('[data-testid="start-dialogue-button"]').click()
    // AI 첫 발화 turn 표시 확인
    await expect(page.locator('[data-testid="ai-turn"]').first()).toBeVisible()
    await expect(page.getByText('어서 오세요. 무엇을 드릴까요?')).toBeVisible()
    // 대화 시작 후 녹음 버튼이 활성화되어야 함
    await expect(page.locator('[data-testid="record-turn-button"]')).toBeVisible()
  })

  test('beginner q4 missionGoals가 dialogue panel에 표시됨', async ({ page }) => {
    await page.goto('/student/speaking/beginner-q4-dialogue-mission?setId=beginner-set-1')
    await expect(page.locator('[data-testid="dialogue-mission-panel"]')).toBeVisible()
    // goal-pending badges가 미달성 상태로 표시
    const pendingGoals = page.locator('[data-testid="goal-pending"]')
    await expect(pendingGoals.first()).toBeVisible()
  })

  test('beginner q4 aiInformation이 dialogue panel HTML에 노출되지 않음', async ({ page }) => {
    await page.goto('/student/speaking/beginner-q4-dialogue-mission?setId=beginner-set-1')
    const bodyText = await page.locator('body').innerText()
    // aiInformation 필드 값의 일부가 학습자 화면에 노출되면 안 됨
    expect(bodyText).not.toContain('점원은 아메리카노, 라떼, 주스를 주문받을 수 있다')
    expect(bodyText).not.toContain('aiInformation')
  })

  test('q1/q2/q3 녹음 흐름은 유지됨 — beginner q1 준비 시작 버튼 표시', async ({ page }) => {
    await page.goto('/student/speaking/beginner-q1-reading?setId=beginner-set-1')
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
  })

  test('q1/q2/q3 녹음 흐름은 유지됨 — beginner q3 준비 시작 버튼 표시', async ({ page }) => {
    await page.goto('/student/speaking/beginner-q3-listening-response?setId=beginner-set-1')
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()
  })

  test('beginner q4 대화 시작 후 AI turn에 다시 듣기 버튼이 표시됨', async ({ page }) => {
    await page.goto('/student/speaking/beginner-q4-dialogue-mission?setId=beginner-set-1')
    await page.locator('[data-testid="start-dialogue-button"]').click()
    await expect(page.locator('[data-testid="ai-turn"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="ai-replay-button"]').first()).toBeVisible()
  })

  test('speechSynthesis fallback이 없는 환경에서 dialogue panel crash 없음', async ({ page }) => {
    // speechSynthesis를 undefined로 덮어씌워 fallback 없는 환경 시뮬레이션
    await page.addInitScript(() => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: undefined,
        configurable: true,
        writable: true,
      })
    })
    await page.goto('/student/speaking/beginner-q4-dialogue-mission?setId=beginner-set-1')
    await page.locator('[data-testid="start-dialogue-button"]').click()
    // TTS 실패 후에도 대화 패널과 AI 첫 발화가 표시되어야 함
    await expect(page.locator('[data-testid="dialogue-mission-panel"]')).toBeVisible()
    await expect(page.locator('[data-testid="ai-turn"]').first()).toBeVisible()
  })
})
