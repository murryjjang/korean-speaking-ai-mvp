import type { Metadata } from 'next'
import { PresentationPracticeClient } from './presentation-practice-client'

export const metadata: Metadata = {
  title: '발표연습 | 한국어 말하기 AI',
  description: '발표 원고를 교정하고, AI 음성을 들으며 섀도잉한 뒤, 제한 시간에 맞춰 발표를 연습하는 기능입니다.',
}

export default function PresentationPracticePage() {
  return <PresentationPracticeClient />
}
