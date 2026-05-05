'use server'

import { createSupabaseServerClient } from '@/src/lib/supabase/server'
import { redirect } from 'next/navigation'

export type LoginState = {
  error: string
} | null

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get('email') as string | null)?.trim() ?? ''
  const password = (formData.get('password') as string | null) ?? ''

  if (!email || !password) {
    return { error: '이메일과 비밀번호를 입력하세요.' }
  }

  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    return { error: 'Supabase가 설정되지 않았습니다. 관리자에게 문의하세요.' }
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user) {
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', authData.user.id)
    .single()

  if (!profile) {
    redirect('/role-missing')
  }

  if (profile.role === 'teacher' || profile.role === 'admin') {
    redirect('/teacher')
  }

  redirect('/student')
}
