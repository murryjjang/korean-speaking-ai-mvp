import { createSupabaseServerClient } from './server'

export type UserProfile = {
  id: string
  userId: string
  role: 'student' | 'teacher' | 'admin'
  displayName: string | null
  studentId: string | null
}

export async function getCurrentUser() {
  const client = await createSupabaseServerClient()
  if (!client) return null
  const {
    data: { user },
    error,
  } = await client.auth.getUser()
  if (error || !user) return null
  return user
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const client = await createSupabaseServerClient()
  if (!client) return null

  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return null

  const { data, error } = await client
    .from('user_profiles')
    .select('id, user_id, role, display_name, student_id')
    .eq('user_id', user.id)
    .single()

  if (error || !data) return null

  return {
    id: data.id as string,
    userId: data.user_id as string,
    role: data.role as UserProfile['role'],
    displayName: data.display_name as string | null,
    studentId: data.student_id as string | null,
  }
}

export async function requireRole(
  allowedRoles: Array<'student' | 'teacher' | 'admin'>
): Promise<UserProfile | null> {
  const profile = await getCurrentProfile()
  if (!profile) return null
  if (!allowedRoles.includes(profile.role)) return null
  return profile
}
