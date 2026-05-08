import { ReadingPracticeClient } from './reading-practice-client'

export const metadata = {
  title: '읽기연습 | Korean Speaking AI',
  description: '짧은 글을 듣고 따라 읽으며 발음, 속도, 끊어 읽기, 정확도를 연습하는 기능입니다.',
}

export default function ReadingPracticePage() {
  return <ReadingPracticeClient />
}
