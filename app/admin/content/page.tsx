// 콘텐츠 관리 (Task 1.7, MVP) — questions CRUD + 수동 태깅. admin 권한(미들웨어 게이팅).
import { PageHeader } from '@/src/components/ui'
import { AdminContentClient } from './admin-content-client'

export const dynamic = 'force-dynamic'

export default function AdminContentPage() {
  return (
    <div className="flex flex-col gap-6" data-testid="admin-content-page">
      <PageHeader
        title="콘텐츠 관리"
        description="문항(questions) 생성·수정·비활성화 및 수동 태깅. (대화미션·문항세트 전체 관리는 후속)"
      />
      <AdminContentClient />
    </div>
  )
}
