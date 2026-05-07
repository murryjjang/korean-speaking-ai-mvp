'use client'

import { useRouter } from 'next/navigation'

export function StartSetButton({
  setId,
  firstQuestionId,
  className,
  children,
}: {
  setId: string
  firstQuestionId: string
  className?: string
  children: React.ReactNode
}) {
  const router = useRouter()

  const handleStart = () => {
    const attemptId = crypto.randomUUID()
    router.push(
      `/student/speaking/${firstQuestionId}?setId=${setId}&attemptId=${attemptId}`,
    )
  }

  return (
    <button type="button" onClick={handleStart} className={className}>
      {children}
    </button>
  )
}
