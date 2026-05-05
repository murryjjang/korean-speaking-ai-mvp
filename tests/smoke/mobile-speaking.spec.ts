import { test, expect } from '@playwright/test'

const MOBILE_VIEWPORT = { width: 360, height: 800 }

test.describe('말하기 평가 모바일 360px smoke', () => {
  test.use({ viewport: MOBILE_VIEWPORT })

  test('q-001 페이지 로드 및 핵심 UI 표시', async ({ page }) => {
    await page.goto('/student/speaking/q-001')

    // 문제 제목 heading 표시 확인 (getByRole로 h2 한정 — '자기소개'가 여러 요소에 포함됨)
    await expect(page.getByRole('heading', { name: /자기소개/ })).toBeVisible()
    await expect(page.getByText('자신을 소개해 보세요')).toBeVisible()

    // 준비 시작 버튼 표시 확인
    const startBtn = page.getByRole('button', { name: '준비 시작' })
    await expect(startBtn).toBeVisible()
  })

  test('준비 시작 버튼이 360px 뷰포트를 벗어나지 않음', async ({ page }) => {
    await page.goto('/student/speaking/q-001')

    const startBtn = page.getByRole('button', { name: '준비 시작' })
    await expect(startBtn).toBeVisible()

    const box = await startBtn.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height).toBeLessThanOrEqual(MOBILE_VIEWPORT.height * 3)
    }
  })

  test('MediaRecorder 미지원 시 화면이 깨지지 않음', async ({ page }) => {
    // MediaRecorder와 getUserMedia를 undefined로 설정해 미지원 환경 시뮬레이션
    await page.addInitScript(() => {
      Object.defineProperty(window, 'MediaRecorder', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      if (navigator.mediaDevices) {
        Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
          value: undefined,
          writable: true,
          configurable: true,
        })
      }
    })

    await page.goto('/student/speaking/q-001')

    // 페이지가 crash 없이 로드되어야 함 (heading으로 한정해 strict mode 위반 방지)
    await expect(page.getByRole('heading', { name: /자기소개/ })).toBeVisible()

    // 준비 시작 버튼은 여전히 표시되어야 함 (녹음 실패는 클릭 후 처리)
    await expect(page.getByRole('button', { name: '준비 시작' })).toBeVisible()

    // JS 오류 없이 렌더링됨 확인
    const pageTitle = page.locator('h1, h2').first()
    await expect(pageTitle).toBeVisible()
  })

  test('문제 듣기/녹음 안내 듣기 버튼 표시 및 클릭 시 crash 없음', async ({ page }) => {
    await page.goto('/student/speaking/q-001')

    // 두 TTS 버튼이 표시되어야 함
    const listenBtn = page.getByRole('button', { name: '문제 듣기' })
    const guideBtn = page.getByRole('button', { name: '녹음 안내 듣기' })
    await expect(listenBtn).toBeVisible()
    await expect(guideBtn).toBeVisible()

    // 360px 뷰포트 안에 있어야 함
    const listenBox = await listenBtn.boundingBox()
    const guideBox = await guideBtn.boundingBox()
    if (listenBox) expect(listenBox.x + listenBox.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width)
    if (guideBox) expect(guideBox.x + guideBox.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width)

    // 버튼 클릭 시 crash 없어야 함 (실제 음성 재생 성공은 강제하지 않음)
    await listenBtn.click()
    await page.waitForTimeout(1500) // API 응답 + 상태 전환 대기

    // 페이지가 여전히 정상 상태여야 함
    await expect(page.getByRole('heading', { name: /자기소개/ })).toBeVisible()
  })

  test('준비 시작 클릭 후 카운트다운 UI 표시', async ({ page }) => {
    await page.goto('/student/speaking/q-001')

    await page.getByRole('button', { name: '준비 시작' }).click()

    // 준비 시간 카운트다운 <p> 표시 확인 (exact: true로 '준비 시간: 30초' 스팬과 구분)
    await expect(page.getByText('준비 시간', { exact: true })).toBeVisible()

    // "준비 완료 — 바로 시작" 버튼이 표시되어야 함
    await expect(page.getByRole('button', { name: /준비 완료/ })).toBeVisible()

    // 카운트다운 버튼도 360px를 벗어나지 않아야 함
    const skipBtn = page.getByRole('button', { name: /준비 완료/ })
    const box = await skipBtn.boundingBox()
    if (box) {
      expect(box.x + box.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width)
    }
  })
})
