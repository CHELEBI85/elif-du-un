import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { AdminShell } from '@/components/admin/admin-shell'

export const dynamic = 'force-dynamic'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  // Middleware zaten koruyor; burası ikinci savunma hattı ve oturum verisi kaynağı.
  const session = await getSession()
  if (!session) redirect('/admin/login')

  return <AdminShell username={session.username}>{children}</AdminShell>
}
