import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret')

async function getUser() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth-token')
  if (!token) redirect('/login')
  try {
    const { payload } = await jwtVerify(token.value, SECRET)
    return payload as any
  } catch (error) {
    redirect('/login')
  }
}

export default async function DashboardPage() {
  const user = await getUser()
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h1>
          <p className="text-gray-600 mb-4">Eingeloggt als: <strong>{user.email}</strong></p>
          <p className="text-gray-600 mb-4">Firma: <strong>{user.tenantName}</strong></p>
          <p className="text-gray-600">Rolle: <strong>{user.role}</strong></p>
          <div className="mt-6">
            <a href="/api/logout" className="bg-red-600 text-white px-4 py-2 rounded">Abmelden</a>
          </div>
        </div>
      </div>
    </main>
  )
}